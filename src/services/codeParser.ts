import * as path from "path";
import * as vscode from "vscode";
const Parser = require("web-tree-sitter");
import { getLanguageName, isLanguageSupported } from "../helpers/langs";
import { parseFunctions, parseText } from "../parser/parser";
import { Function } from "../parser/types";
import {
  ChangeDetectionService,
  getChangeDetectionService,
} from "../autodoc/changeDetection";
import DocstringInsertService from "../autodoc/DocstringInsertService";
import { TelemetryService } from "./telemetry";
import { Tree } from "web-tree-sitter";

const getGrammarPath = (context: vscode.ExtensionContext, language: string) => {
  let grammarPath = context.asAbsolutePath(
    path.join("grammars", "tree-sitter-" + language + ".wasm")
  );

  return grammarPath;
};

export class CodeParserService {
  //Format: First key is file uri hash, second key is function name + params hash, value is recommended docstring
  parser: any;
  loadedLanguages: any = {
    csharp: null,
    java: null,
    javascript: null,
    python: null,
    typescript: null,
  };
  parsedFunctions: Function[] = [];
  changeDetectionService: ChangeDetectionService;
  autodocService: DocstringInsertService;
  telemetryService: TelemetryService;

  constructor(
    context: vscode.ExtensionContext,
    telemetryService: TelemetryService
  ) {
    this.telemetryService = telemetryService;
    this.changeDetectionService = getChangeDetectionService();
    this.autodocService = new DocstringInsertService(
      context,
      this,
      telemetryService
    );
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
      .then(async () => {
        this.parser = await new Parser();

        // Now parse when the active editor changes, a document is saved, or a document is opened
        vscode.window.onDidChangeActiveTextEditor(
          (editor: vscode.TextEditor | undefined) => {
            const doc = editor?.document;
            if (doc) {
              this.parse(doc);
            }
          }
        );
        return this;
      });
  }

  public parseNoTrack = async (
    doc: vscode.TextDocument
  ): Promise<Function[]> => {
    // Language check
    const lang = getLanguageName(doc.languageId, doc.fileName);
    if (!isLanguageSupported(lang)) return [];

    let tree: Tree | undefined =
      this.changeDetectionService.getHistory(doc).tree;
    // Parse the document
    await this.safeParseText(doc.getText(), lang, tree);

    // Return the functions that are now stored in the service
    return this.getFunctions();
  };

  public parse = async (doc: vscode.TextDocument) => {
    const lang = getLanguageName(doc.languageId, doc.fileName);

    // Filter bad input (mostly for supported languages etc)
    if (!isLanguageSupported(lang)) return;

    let tree: Tree | undefined =
      this.changeDetectionService.getHistory(doc).tree;

    let newTree = await this.safeParseText(doc.getText(), lang, tree);
    if (!newTree) {
      return {};
    }
    let functions = this.getFunctions();
    if (functions.length == 0) {
      return {};
    }

    // This returns a list of the functions we want to highlight or update
    return this.changeDetectionService.trackState(doc, functions, newTree);
  };

  public safeParseText = async (
    text: string,
    lang: string,
    tree: Tree | undefined = undefined
  ) => {
    if (!this.loadedLanguages[lang]) return;
    if (!this.parser) return;
    let retTree: Tree | undefined = undefined;
    await parseText(text, this.loadedLanguages[lang], this.parser, tree)
      .then((tree) => {
        retTree = tree;
        return parseFunctions(tree, lang, this.loadedLanguages[lang]);
      })
      .then((functions) => {
        this.parsedFunctions = functions;
      })
      .catch((err) => {
        console.error(err);
      });
    return retTree;
  };

  public getFunctions() {
    return this.parsedFunctions;
  }
}

let service: CodeParserService | undefined;

export let createCodeParserService = async (
  context: vscode.ExtensionContext,
  telemetryService: TelemetryService
) => {
  if (!service) {
    service = await new CodeParserService(context, telemetryService);
  }
  return service!;
};

export let getCodeParserService = () => {
  return service!;
};
