import * as path from "path";
import * as vscode from "vscode";
const Parser = require("web-tree-sitter");
import { getLanguageName, isLanguageSupported } from "../helpers/langs";
import { parseDocument, parseFunctions } from "../parser/parser";
import { Function } from "../parser/types";

const getGrammarPath = (context: vscode.ExtensionContext, language: string) => {
  let grammarPath = context.asAbsolutePath(
    path.join("grammars", "tree-sitter-" + language + ".wasm")
  );

  console.log(grammarPath);

  return grammarPath;
};

export class CodeParserService {
  parser: any;
  loadedLanguages: any = {
    csharp: null,
    java: null,
    javascript: null,
    python: null,
  };
  parsedFuntions: Function[] = [];

  constructor(context: vscode.ExtensionContext) {
    // Initialize our TS Parser
    Parser.init({
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
        vscode.workspace.onDidSaveTextDocument(this.parse);
        vscode.workspace.onDidOpenTextDocument(this.parse);
      });
  }

  private parse = (doc: vscode.TextDocument) => {
    const lang = getLanguageName(doc.languageId, doc.fileName);

    // Filter bad input (mostly for supported languages etc)
    if (!this.parser) return;
    if (!isLanguageSupported(lang)) return;
    if (!this.loadedLanguages[lang]) return;

    parseDocument(doc, this.loadedLanguages, lang, this.parser)
      .then((tree) => {
        return parseFunctions(tree, lang, this.loadedLanguages[lang]);
      })
      .then((functions) => {
        this.parsedFuntions = functions;
      })
      .catch((err) => {
        console.log(err);
      });
  };

  public getFunctions() {
    return this.parsedFuntions;
  }
}
