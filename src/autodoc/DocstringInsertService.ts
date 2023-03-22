import * as vscode from "vscode";
import { CodeParserService } from "../services/codeParser";
import { DocTag, DocstringRecommendation, Function } from "../parser/types";
import {
  DocsService,
  writeDocstringsFromParsedDocument,
} from "../services/docs";
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

  private updating = new Set<vscode.TextDocument>();

  private changedFunctions: { [key: string]: Set<String> } = {};

  public AUTODOC_AUTO_TAG = "@trelent-auto";
  public AUTODOC_IGNORE_TAG = "@trelent-ignore";
  public AUTO_DOC_HIGHLIGHT_TAG = "@trelent-highlight";

  constructor(
    private context: vscode.ExtensionContext,
    codeParserService: CodeParserService,
    telemetryService: TelemetryService
  ) {
    this.codeParserService = codeParserService;
    this.telemetryService = telemetryService;
    this.docstringDecorator = new DocstringDecorator();
    this.docstringCodelens = new DocstringCodelens();
    vscode.commands.registerCommand(
      "trelent.autodoc.update",
      (document: vscode.TextDocument, functionToUpdate: Function) => {
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
    );

    vscode.commands.registerCommand(
      "trelent.autodoc.ignore",
      (document: vscode.TextDocument, functionToIgnore: Function) => {
        let funcId = hashFunction(functionToIgnore);
        let docId = hashID(document);
        if (this.changedFunctions[docId]) {
          this.changedFunctions[docId].delete(funcId);
        }
      }
    );

    vscode.workspace.onDidChangeTextDocument((event) => {
      this.updateDocstrings(event.document);
    });
  }

  public async updateDocstrings(document: vscode.TextDocument) {
    const editor = vscode.window.visibleTextEditors.find(
      (editor) => editor.document === document
    );
    if (!editor) {
      return;
    }
    let docId = hashID(document);
    if (!this.changedFunctions[docId]) {
      this.changedFunctions[docId] = new Set();
    }

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
      //Remove deleted functions from docstring recommendations

      changedFunctions.deleted.forEach((func) => {
        let funcId = hashFunction(func);
        this.changedFunctions[docId].delete(funcId);
      });

      //Update function updates
      Object.keys(changedFunctions)
        .filter((title) => title != "deleted")
        .flatMap((title) => changedFunctions[title])
        .forEach((func) => {
          let funcId = hashFunction(func);
          this.changedFunctions[docId].add(funcId);
        });

      //Update docstring recommendations
      let functionsToDocument: Function[] = [
        ...this.changedFunctions[docId],
      ].map(
        (funcId) => allFunctions.find((func) => hashFunction(func) == funcId)!
      );

      //Get tags
      let taggedFunctions = this.getFunctionTags(functionsToDocument);
      //If there's no functions
      if (taggedFunctions.length == 0) {
        this.updating.delete(document);
        return [];
      }

      //Auto document functions
      let autoFunctions = taggedFunctions
        .filter((tagFunc) => tagFunc.tag == DocTag.AUTO)
        .map((tagFunc) => tagFunc.function);
      offsetVal += await this.documentFunctions(
        autoFunctions,
        editor,
        document
      );
    } catch (e) {
      console.log(e);
    } finally {
      allFunctions = await this.codeParserService.parseNoTrack(document);
      this.applyHighlights(document, allFunctions);
      this.updating.delete(document);
      return {};
    }
  }

  private async documentFunctions(
    functions: Function[],
    editor: vscode.TextEditor,
    document: vscode.TextDocument
  ) {
    let offsetVal = 0;
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
            let docstringStartPoint = document.positionAt(startPointOffset - 1);
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
    this.applyHighlights(document);
    return offsetVal;
  }
  private getFunctionTags(
    functions: Function[]
  ): { function: Function; tag: DocTag }[] {
    let tagMatching: { function: Function; tag: DocTag }[] = [];

    for (let func of functions) {
      let match = func.body.match(
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
    let docId = hashID(doc);
    let funcId = hashFunction(func);
    if (!this.changedFunctions[docId]) {
      this.changedFunctions[docId] = new Set();
    }
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
    let docId = hashID(doc);
    //Get tagged functions
    let functionsToDocument: Function[] = [...this.changedFunctions[docId]].map(
      (funcId) => allFunctions?.find((func) => hashFunction(func) == funcId)!
    );

    let taggedFunctions = this.getFunctionTags(functionsToDocument);
    //Highlight Functions
    let highlightFunctions = taggedFunctions
      .filter((tagFunc) => tagFunc.tag == DocTag.HIGHLIGHT)
      .map((tagFunc) => tagFunc.function);
    this.docstringCodelens.registerCodeLensProvider(highlightFunctions);
    if (highlightFunctions.length > 0) {
      this.docstringDecorator.applyDocstringRecommendations(
        highlightFunctions,
        doc
      );
    } else {
      this.docstringDecorator.clearDecorations(doc);
    }
  }
}
