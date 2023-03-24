import * as vscode from "vscode";
import { CodeParserService } from "../services/codeParser";
import { DocTag, Function } from "../parser/types";
import { writeDocstringsFromParsedDocument } from "../services/docs";
import { TelemetryService } from "../services/telemetry";
import { hashFunction, hashID } from "./changeDetection";
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

  private changedFunctions: { [key: string]: Set<String> } = {};

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

    // Now make sure we listen to all the ways a document can change
    vscode.workspace.onDidOpenTextDocument(
      (changedDocument: vscode.TextDocument) => {
        this.updateDocstrings(changedDocument);
      },
      null,
      this.context.subscriptions
    );

    let timeoutId: NodeJS.Timeout | undefined = undefined;
    vscode.workspace.onDidChangeTextDocument(
      (event: vscode.TextDocumentChangeEvent) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(
          (e) => {
            this.updateDocstrings(e.document);
          },
          this.CHANGE_TIME_THRESHOLD,
          event
        );
        this.applyHighlights(event.document);
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
    let funcId = hashFunction(functionToIgnore);
    let docId = this.verifyDocument(document);
    if (this.changedFunctions[docId]) {
      this.changedFunctions[docId].delete(funcId);
    }
    this.applyHighlights(document);
  }

  private async updateDocstrings(document: vscode.TextDocument) {
    const editor = vscode.window.visibleTextEditors.find(
      (editor) => editor.document === document
    );
    if (!editor) {
      return;
    }
    let docId = this.verifyDocument(document);

    await this.codeParserService.parse(document);

    let fileHistory =
      this.codeParserService.changeDetectionService.getHistory(document);

    let allFunctions = fileHistory.allFunctions;

    this.applyHighlights(document, fileHistory.allFunctions);
    if (this.updating.has(document)) {
      return;
    }
    this.updating.add(document);

    let changedFunctions: { [key: string]: Function[] } = fileHistory.updates;

    let offsetVal = 0;

    try {
      // Remove deleted functions from docstring recommendations
      changedFunctions.deleted.forEach((func) => {
        let funcId = hashFunction(func);
        this.changedFunctions[docId].delete(funcId);
      });

      // Update function updates
      Object.keys(changedFunctions)
        .filter((title) => title != "deleted")
        .flatMap((title) => changedFunctions[title])
        .forEach((func) => {
          let funcId = hashFunction(func);
          this.changedFunctions[docId].add(funcId);
        });

      // Map our function ids to the actual functions
      let functionsToDocument: Function[] = [
        ...this.changedFunctions[docId],
      ].map(
        (funcId) => allFunctions.find((func) => hashFunction(func) == funcId)!
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

      offsetVal += await this.documentFunctions(
        autoFunctions,
        editor,
        document
      );
    } finally {
      allFunctions = await this.codeParserService.parseNoTrack(document);
      this.applyHighlights(document, allFunctions);
      this.updating.delete(document);
    }
  }

  public async documentFunctions(
    functions: Function[],
    editor: vscode.TextEditor,
    document: vscode.TextDocument
  ) {
    this.widgetLoadingState(true);
    let offsetVal = 0;
    try {
      if (functions.length > 0) {
        let docstrings = await writeDocstringsFromParsedDocument(
          this.context,
          document,
          functions,
          this.telemetryService
        );
        let allFunctions = await this.codeParserService.parseNoTrack(document);
        docstrings
          .filter((docPair) => {
            return allFunctions.find(
              (func) => hashFunction(func) == hashFunction(docPair.function)
            );
          })
          .forEach((docPair) => {
            try {
              docPair.function = allFunctions.find(
                (func) => hashFunction(func) == hashFunction(docPair.function)
              )!;
            } finally {
            }
          });

        for (let docstring of docstrings) {
          let func = docstring.function;
          try {
            if (func.docstring_range) {
              let startPointOffset = document.offsetAt(
                new vscode.Position(func.docstring_range[0][0] + offsetVal, 0)
              );
              let docstringStartPoint = document.positionAt(
                startPointOffset - 1
              );
              let endPointOffset = document.offsetAt(
                new vscode.Position(
                  func.docstring_range[1][0] + offsetVal,
                  func.docstring_range[1][1]
                )
              );
              let docstringEndPoint = document.positionAt(endPointOffset);
              let range = new vscode.Range(
                docstringStartPoint,
                docstringEndPoint
              );
              let docstringSize = (document.getText(range).match(/\n/g) || [])
                .length;
              await editor
                ?.edit((editBuilder) => {
                  editBuilder.replace(range, "");
                })
                .then((success) => {
                  if (success) {
                    offsetVal -= docstringSize;
                  }
                });
            }
          } finally {
            this.markAsChanged(document, func);
          }
        }

        let insertionDocstrings = docstrings
          .filter((pair) => {
            return pair.function.docstring_point;
          })
          .map((docstring) => {
            let pos = new vscode.Position(
              docstring.function.docstring_point![0] + offsetVal,
              docstring.function.docstring_point![1]
            );
            return {
              docstring: docstring.docstring,
              point: [pos.line, pos.character],
            };
          });

        offsetVal += await insertDocstrings(
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

      return offsetVal;
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
        case "Enable Per-Function": {
          return DocTag.IGNORE;
        }
        case "Enable Globally": {
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
    let docId = this.verifyDocument(doc);
    let funcId = hashFunction(func);
    if (this.changedFunctions[docId].has(funcId)) {
      this.changedFunctions[docId].delete(funcId);
    }
  }

  private async applyHighlights(
    doc: vscode.TextDocument,
    allFunctions: Function[] | undefined = undefined
  ) {
    if (!allFunctions) {
      allFunctions = await this.codeParserService.parseNoTrack(doc);
    }
    let docId = this.verifyDocument(doc);
    //Get tagged functions
    let functionsToDocument: Function[] = [...this.changedFunctions[docId]].map(
      (funcId) => allFunctions?.find((func) => hashFunction(func) == funcId)!
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

  //UTIL
  private verifyDocument(doc: vscode.TextDocument) {
    let docId = hashID(doc);
    if (!this.changedFunctions[docId]) {
      this.changedFunctions[docId] = new Set();
    }
    return docId;
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
