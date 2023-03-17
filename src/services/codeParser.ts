import * as path from "path";
import * as vscode from "vscode";
const Parser = require("web-tree-sitter");
import { getLanguageName, isLanguageSupported } from "../helpers/langs";
import { parseFunctions, parseText } from "../parser/parser";
import { DocstringRecommendation, Function } from "../parser/types";
import { ChangeDetectionService, hashFunction, hashID } from "./changeDetection";
import DocstringDecorator from "../autodoc/DocstringDecorator";

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
  docstringDecorator: DocstringDecorator;

  constructor(context: vscode.ExtensionContext) {
    this.changeDetectionService = new ChangeDetectionService();
    this.docstringDecorator = new DocstringDecorator(context);
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
        vscode.workspace.onDidSaveTextDocument(this.parse);
        vscode.workspace.onDidOpenTextDocument(this.parse);
        return this;
      });
  }

  public parse = async (doc: vscode.TextDocument) => {
    const lang = getLanguageName(doc.languageId, doc.fileName);

    // Filter bad input (mostly for supported languages etc)
    if (!isLanguageSupported(lang)) return;

    await this.parseText(doc.getText(), lang);
    let functions = this.getFunctions();

    this.updateRecommendedDocstrings(doc, functions);
    return functions;
  };

  private async updateRecommendedDocstrings(doc: vscode.TextDocument, functions: Function[]){
    let changes = this.changeDetectionService.trackState(doc, functions);

    let docId = hashID(doc);

    let docstringRecommendations = this.recommendedDocstrings[docId] || {};

    let newFunctions: Function[] = changes.new;
    let updatedFunctions: Function[] = changes.updated;
    let deletedFunctions: Function[] = changes.deleted;
    
    let functionsToDocument: {[key: string]: Function} = {};

    //mark the new functions to be documented
    newFunctions.forEach((func) => {
      const funcId = hashFunction(func);
      if(docstringRecommendations[funcId]) {
        console.error(`Function with id ${funcId} already has a recommended docstring, so it's not a new function`);
        return;
      }
      functionsToDocument[funcId] = func;
    });

    //mark the updated functions to be documented
    updatedFunctions.forEach((func) => {
      const funcId = hashFunction(func);
      if(!docstringRecommendations[funcId]){
        console.error(`Function with id ${funcId} doesn't have a recommended docstring, so it's not an updated function`);
        return;
      }
      functionsToDocument[funcId] = func;
    })

    //Delete docstrings for deleted functions
    deletedFunctions.forEach((func) => {
      const funcId = hashFunction(func);
      if(!docstringRecommendations[funcId]){
        console.error(`Function with id ${funcId} doesn't have a recommended docstring, so it's not a deleted function`);
        return;
      }
      delete docstringRecommendations[funcId];
    });

    //Update the recommended docstrings

    let newDocstringRecommendations = await this.requestDocstrings(doc, functionsToDocument);

    //Populate docstring recommendations
    Object.keys(newDocstringRecommendations).forEach((funcId) => {
      docstringRecommendations[funcId] = newDocstringRecommendations[funcId];
    });

    this.docstringDecorator.applyDocstringRecommendations(Object.values(docstringRecommendations), doc);
    

  }

  private async requestDocstrings(doc: vscode.TextDocument, functions: {[key: string]: Function}): Promise<{ [key: string]: DocstringRecommendation}> {
    //TODO: Implement this method
    
    let returnThis: {[key: string]: DocstringRecommendation} = {};
    Object.keys(functions).forEach((funcId) => {
      let func = functions[funcId];
      let docstringRecommendation: DocstringRecommendation = {
        recommendedDocstring: "This is a docstring",
        function: func
      }
      returnThis[funcId] = docstringRecommendation;
    });
    return returnThis;
  }

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