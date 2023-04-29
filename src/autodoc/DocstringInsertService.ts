import * as vscode from "vscode";
import { CodeParserService } from "../services/codeParser";
import { DocTag, Function } from "../parser/types";
import { writeDocstringsFromParsedDocument } from "../services/docs";
import { TelemetryService } from "../services/telemetry";
import { hashFunction } from "./changeDetection";
import DocstringDecorator from "./DocstringDecorator";
import { insertDocstrings } from "../helpers/util";
import DocstringCodelens from "./DocstringCodelens";

export default class DocstringInsertService {
  private codeParserService: CodeParserService;
  private telemetryService: TelemetryService;
  private docstringDecorator: DocstringDecorator;
  private docstringCodelens: DocstringCodelens;
  private documentationWidget: vscode.StatusBarItem;

  private updating = new Set<vscode.TextDocument>();

  public AUTODOC_AUTO_TAG = "@trelent-auto";
  public AUTODOC_IGNORE_TAG = "@trelent-ignore";
  public AUTO_DOC_HIGHLIGHT_TAG = "@trelent-highlight";
  private CHANGE_TIME_THRESHOLD = 500;

  constructor(
    private context: vscode.ExtensionContext,
    codeParserService: CodeParserService,
    telemetryService: TelemetryService
  ) {
    this.codeParserService = codeParserService;
    this.telemetryService = telemetryService;
    this.docstringDecorator = new DocstringDecorator();
    this.docstringCodelens = new DocstringCodelens();

    //Create documentation widget
    this.documentationWidget = vscode.window.createStatusBarItem(
      "trelent.document",
      vscode.StatusBarAlignment.Right,
      9999
    );

    this.widgetLoadingState(false);
    context.subscriptions.push(this.documentationWidget);
    this.documentationWidget.show();

    // Register the update and ignore commands for our codelens
    vscode.commands.registerCommand(
      "trelent.autodoc.update",
      this.onAutodocUpdate,
      this
    );

    vscode.commands.registerCommand(
      "trelent.autodoc.ignore",
      this.onAutodocIgnore,
      this
    );

    //When the file changes
    let timeoutId: NodeJS.Timeout | undefined = undefined;
    vscode.workspace.onDidChangeTextDocument(
      async (event: vscode.TextDocumentChangeEvent) => {
        try {
          //Update range references
          this.codeParserService.changeDetectionService.updateRange(
            event.document,
            event.contentChanges
          );

          //Apply highlights to the document after the ranges have been updated
          this.applyHighlights(event.document);

          //Clear the timeout if it exists
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          //Set a new timeout
          timeoutId = setTimeout(
            (e) => {
              if (
                event.reason != vscode.TextDocumentChangeReason.Undo &&
                event.reason != vscode.TextDocumentChangeReason.Redo
              ) {
                this.updateDocstrings(e.document);
              }
            },
            this.CHANGE_TIME_THRESHOLD,
            event
          );
        } finally {
        }
      },
      null,
      this.context.subscriptions
    );

    vscode.window.onDidChangeVisibleTextEditors(
      (e) => {
        // Any of which could be new (not just the active one).
        e.forEach((editor) => {
          this.updateDocstrings(editor.document);
        });
      },
      null,
      this.context.subscriptions
    );

    vscode.workspace.onDidOpenTextDocument(
      (doc) => {
        this.codeParserService.parse(doc);
      },
      null,
      this.context.subscriptions
    );

    vscode.workspace.onDidCloseTextDocument((event) => {
      this.codeParserService.changeDetectionService.closeFile(event.uri);
    });
  }

  private onAutodocUpdate(
    document: vscode.TextDocument,
    functionToUpdate: Function
  ) {
    const editor = vscode.window.visibleTextEditors.find(
      (editor) => editor.document === document
    );
    if (!editor) {
      return;
    }

    vscode.commands.executeCommand(
      "trelent.autodoc.ignore",
      document,
      functionToUpdate
    );
    this.documentFunctions([functionToUpdate], editor, document);
  }

  private onAutodocIgnore(
    document: vscode.TextDocument,
    functionToIgnore: Function
  ) {
    this.codeParserService.changeDetectionService.deleteChangedFunctionForDocument(
      document,
      functionToIgnore
    );
    this.applyHighlights(document);
  }

  private async updateDocstrings(document: vscode.TextDocument) {
    const editor = vscode.window.visibleTextEditors.find(
      (editor) => editor.document === document
    );
    if (!editor) {
      return;
    }

    await this.codeParserService.parse(document);

    this.applyHighlights(document);

    let fileHistory =
      this.codeParserService.changeDetectionService.getDocumentFunctionData(
        document
      );

    let allFunctions = fileHistory.allFunctions;
    if (this.updating.has(document)) {
      return;
    }
    this.updating.add(document);

    try {
      let functionsToDocument = Object.values(
        this.codeParserService.changeDetectionService.getChangedFunctionsForDocument(
          document
        )
      );
      // Get tagged functions, and remove any that should be ignored
      let taggedFunctions = this.getFunctionTags(functionsToDocument);
      if (taggedFunctions.length == 0) {
        this.updating.delete(document);
        return;
      }

      // Get functions to be documented, and proceed
      let autoFunctions = taggedFunctions
        .filter((tagFunc) => tagFunc.tag == DocTag.AUTO)
        .map((tagFunc) => tagFunc.function);

      await this.documentFunctions(autoFunctions, editor, document);
    } finally {
      this.applyHighlights(document, allFunctions);
      this.updating.delete(document);
    }
  }

  /**
   * The documentFunctions function is responsible for inserting docstrings into a document.
   *
   *
   * @param functions: Function[] Pass in the functions that were parsed from the document
   * @param editor: vscode.TextEditor Get the current editor
   * @param document: vscode.TextDocument Get the document that is currently open in the editor
   *
   * @return A promise that resolves to void
   *
   * @docauthor Trelent
   */
  public async documentFunctions(
    functions: Function[],
    editor: vscode.TextEditor,
    document: vscode.TextDocument
  ) {
    //Notify the widget to update
    this.widgetLoadingState(true);

    try {
      // If we have functions to document, write the docstrings
      if (functions.length > 0) {
        // Write the docstrings
        let docstrings = await writeDocstringsFromParsedDocument(
          this.context,
          document,
          functions,
          this.telemetryService
        );

        //Reparse in case something changed

        for (let docstring of docstrings) {
          let func = docstring.function;
          try {
            if (func.docstring_range) {
              let docstringStartOffset = document.offsetAt(
                document.lineAt(document.positionAt(func.docstring_range[0]))
                  .range.start
              );
              let docstringStartPoint = document.positionAt(
                docstringStartOffset - 1
              );
              let docstringEndPoint = document.positionAt(
                func.docstring_range[1]
              );
              let range = new vscode.Range(
                docstringStartPoint,
                docstringEndPoint
              );
              await editor?.edit((editBuilder) => {
                editBuilder.replace(range, "");
              });
            }
          } finally {
            this.markAsChanged(document, func);
          }
        }
        let insertionDocstrings: { docstring: string; point: number[] }[] = [];

        docstrings = docstrings.filter((pair) => {
          return pair.function.docstring_offset;
        });
        for (let docstring of docstrings) {
          let funct = docstring.function;
          let pos = document.positionAt(funct.docstring_offset);
          insertionDocstrings.push({
            docstring: docstring.docstring,
            point: [pos.line, pos.character],
          });
        }

        await insertDocstrings(
          insertionDocstrings,
          editor,
          document.languageId
        );
      }
      this.widgetLoadingState(false);
    } catch (e) {
      this.widgetLoadingState(false, true);
    } finally {
      // TODO: We probably want to do this somewhere else?
      this.applyHighlights(document);
    }
  }

  private getFunctionTags(
    functions: Function[]
  ): { function: Function; tag: DocTag }[] {
    let tagMatching: { function: Function; tag: DocTag }[] = [];

    for (let func of functions) {
      let matchString = func.text;
      if (func.docstring) {
        matchString += func.docstring;
      }
      let match = matchString.match(
        new RegExp(
          this.AUTODOC_AUTO_TAG +
            "|" +
            this.AUTODOC_IGNORE_TAG +
            "|" +
            this.AUTO_DOC_HIGHLIGHT_TAG,
          "g"
        )
      );
      if (match != null) {
        switch (match[0]) {
          case this.AUTODOC_AUTO_TAG: {
            tagMatching.push({ function: func, tag: DocTag.AUTO });
            break;
          }
          case this.AUTODOC_IGNORE_TAG: {
            tagMatching.push({ function: func, tag: DocTag.IGNORE });
            break;
          }
          case this.AUTO_DOC_HIGHLIGHT_TAG: {
            tagMatching.push({ function: func, tag: DocTag.HIGHLIGHT });
            break;
          }
          default: {
            tagMatching.push({ function: func, tag: DocTag.NONE });
            break;
          }
        }
      } else {
        tagMatching.push({ function: func, tag: DocTag.NONE });
      }
    }
    //Remove ignored functions

    const trelentConfig = vscode.workspace.getConfiguration("trelent");
    const autodocMode = trelentConfig.get("autodoc.mode");

    const configTag: DocTag = ((): DocTag => {
      switch (autodocMode) {
        case "Highlight Per-Function": {
          return DocTag.IGNORE;
        }
        case "Highlight Globally": {
          return DocTag.HIGHLIGHT;
        }
        case "Maintain Docstrings": {
          return DocTag.AUTO;
        }
        default: {
          return DocTag.IGNORE;
        }
      }
    })();

    //Assign default value to NONE tags, and remove IGNORE tags
    return tagMatching
      .map((tagFunc) => {
        let tag = tagFunc.tag === DocTag.NONE ? configTag : tagFunc.tag;
        return { function: tagFunc.function, tag: tag };
      })
      .filter((tagFunc) => {
        return tagFunc.tag != DocTag.IGNORE;
      });
  }

  public markAsChanged(doc: vscode.TextDocument, func: Function) {
    this.codeParserService.changeDetectionService.deleteChangedFunctionForDocument(
      doc,
      func
    );
  }

  private async applyHighlights(
    doc: vscode.TextDocument,
    allFunctions: Function[] | undefined = undefined
  ) {
    if (!allFunctions) {
      allFunctions =
        this.codeParserService.changeDetectionService.getDocumentFunctionData(
          doc
        ).allFunctions;
    }
    if (allFunctions.length == 0) {
      let parsed = await this.codeParserService.parse(doc);
      if (!parsed) {
        return;
      }
      allFunctions =
        this.codeParserService.changeDetectionService.getDocumentFunctionData(
          doc
        ).allFunctions;
    }
    //Get tagged functions
    let functionsToDocument: Function[] = Object.values(
      this.codeParserService.changeDetectionService.getChangedFunctionsForDocument(
        doc
      )
    ).map(
      (oldFunc) =>
        allFunctions?.find(
          (func) => hashFunction(func) == hashFunction(oldFunc)
        )!
    );

    let taggedFunctions = this.getFunctionTags(functionsToDocument);
    //Highlight Functions
    let highlightFunctions = taggedFunctions
      .filter((tagFunc) => tagFunc.tag == DocTag.HIGHLIGHT)
      .map((tagFunc) => tagFunc.function);
    this.docstringCodelens.updateCodeLenses(highlightFunctions);
    if (highlightFunctions.length > 0) {
      this.docstringDecorator.applyDocstringRecommendations(
        highlightFunctions,
        doc
      );
    } else {
      this.docstringDecorator.clearDecorations(doc);
    }
  }

  private widgetLoadingState(
    documenting: boolean,
    error: boolean = false,
    errorMessage?: string
  ) {
    if (error) {
      this.widgetErrorState(errorMessage ? errorMessage : "Error Documenting!");
      return;
    }
    this.documentationWidget.backgroundColor = new vscode.ThemeColor(
      documenting
        ? "statusBarItem.hoverBackground"
        : "statusBarItem.remoteBackground"
    );
    this.documentationWidget.text = documenting
      ? "$(sync~spin)"
      : "$(trelent-dark)";
    this.documentationWidget.tooltip = documenting
      ? "Documenting..."
      : "Trelent Documentation";
  }

  private widgetErrorState(errMsg: string) {
    this.documentationWidget.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground"
    );
    this.documentationWidget.tooltip = errMsg;
  }
}
