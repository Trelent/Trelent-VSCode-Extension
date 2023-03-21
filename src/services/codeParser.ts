import * as path from "path";
import * as vscode from "vscode";
const Parser = require("web-tree-sitter");
import { getLanguageName, isLanguageSupported } from "../helpers/langs";
import { parseFunctions, parseText } from "../parser/parser";
import { DocstringRecommendation, Function } from "../parser/types";
import { ChangeDetectionService, hashFunction, hashID } from "../autodoc/changeDetection";
import DocstringInsertService from "../autodoc/DocstringInsertService";
import { TelemetryService } from "./telemetry";

const getGrammarPath = (context: vscode.ExtensionContext, language: string) => {
  let grammarPath = context.asAbsolutePath(
    path.join("grammars", "tree-sitter-" + language + ".wasm")
  );

  return grammarPath;
};

export class CodeParserService {
  //Format: First key is file uri hash, second key is function name + params hash, value is recommended docstring
  recommendedDocstrings: { [key: string]: {[key: string]: DocstringRecommendation} } = {};
  parser: any;
  loadedLanguages: any = {
    csharp: null,
    java: null,
    javascript: null,
    python: null,
    typescript: null
  };
  parsedFunctions: Function[] = [];
  changeDetectionService: ChangeDetectionService;
  autodocService: DocstringInsertService;
  telemetryService: TelemetryService;

  constructor(context: vscode.ExtensionContext, telemetryService: TelemetryService) {
    this.telemetryService = telemetryService;
    this.changeDetectionService = new ChangeDetectionService();
    this.autodocService = new DocstringInsertService(context, this, telemetryService);
    // Initialize our TS Parser
    return Parser.init({
      locateFile(scriptName: string, scriptDirectory: string) {
        let scriptPath = context.asAbsolutePath(
          path.join("grammars", scriptName)
        );
        return scriptPath;
      },
    })
      .then(async () => {
        // Load our language grammars
        this.loadedLanguages.csharp = await Parser.Language.load(
          getGrammarPath(context, "c_sharp")
        );
        this.loadedLanguages.java = await Parser.Language.load(
          getGrammarPath(context, "java")
        );
        this.loadedLanguages.javascript = await Parser.Language.load(
          getGrammarPath(context, "javascript")
        );
        this.loadedLanguages.python = await Parser.Language.load(
          getGrammarPath(context, "python")
        );
        this.loadedLanguages.typescript = await Parser.Language.load(
          getGrammarPath(context, "typescript")
        );
      })
      .then(() => {
        this.parser = new Parser();
        
        // Now parse when the active editor changes, a document is saved, or a document is opened
        vscode.window.onDidChangeActiveTextEditor(
          (editor: vscode.TextEditor | undefined) => {
            const doc = editor?.document;
            if (doc) {
              this.parse(doc);
            }
          }
        );
      //  vscode.workspace.onDidSaveTextDocument(this.parse);
      //  vscode.workspace.onDidOpenTextDocument(this.parse);
        return this;
      });
  }

  public parse = async (doc: vscode.TextDocument) => {
    const lang = getLanguageName(doc.languageId, doc.fileName);

    // Filter bad input (mostly for supported languages etc)
    if (!isLanguageSupported(lang)) return;

    await this.parseText(doc.getText(), lang);
    let functions = this.getFunctions();
    return this.changeDetectionService.trackState(doc, functions);
  };

  public parseText = async (text: string, lang: string) => {
    if (!this.loadedLanguages[lang]) return;
    if (!this.parser) return; 
    await parseText(text, this.loadedLanguages[lang], this.parser)
      .then((tree) => {
        return parseFunctions(tree, lang, this.loadedLanguages[lang]);
      })
      .then((functions) => {
        this.parsedFunctions = functions;
      })
      .catch((err) => {
        console.error(err);
      });
  }

  public getFunctions() {
    return this.parsedFunctions;
  }
}