import * as vscode from "vscode";
import { Language, QueryCapture, Tree } from "web-tree-sitter";
import { getAllFuncsQuery } from "./queries";
import { parsePythonFunctions } from "./langs/python";
import { parseCSharpFunctions } from "./langs/csharp";
import { parseJavaFunctions } from "./langs/java";
import { parseJavaScriptFunctions } from "./langs/javascript";
import { Function } from "./types";

export const parseDocument = async (
  document: vscode.TextDocument,
  loadedLanguages: { [key: string]: Language },
  language: string,
  parser: any
) => {
  // Set the parser language
  parser.setLanguage(loadedLanguages[language]);

  // Parse the document
  return parser.parse(document.getText()) as Tree;
};

export const parseFunctions = async (
  tree: Tree,
  lang: string,
  TSLanguage: Language
) => {
  let allFuncsQuery = getAllFuncsQuery(lang, TSLanguage);

  if (!allFuncsQuery) {
    console.error("Query not found for language", lang);
    return [];
  }

  let allFuncsCaptures = removeDuplicateNodes(
    allFuncsQuery.captures(tree.rootNode)
  );

  console.log("Lang = " + lang);
  console.log("All Captures:");
  console.log(allFuncsCaptures);

  let parser = getParser(lang);
  if (!parser) {
    console.error(`Could not find parser for lang ${lang}`);
    return [];
  }

  let allFunctions = parser(allFuncsCaptures, tree);

  console.log("All Functions:");
  console.log(allFunctions);

  // Return our merged array of functions
  return allFunctions;
};

const getParser = (lang: string) => {
  let parsers: {
    [key: string]: (captures: QueryCapture[], tree: Tree) => Function[];
  } = {
    python: parsePythonFunctions,
    java: parseJavaFunctions,
    csharp: parseCSharpFunctions,
    javascript: parseJavaScriptFunctions,
  };
  return parsers[lang];
};

const removeDuplicateNodes = (captures: QueryCapture[]) => {
  let parsedNodeIds: number[] = [];
  captures = captures.filter((capture) => {
    if (parsedNodeIds.includes(capture.node.id)) {
      return false;
    }

    parsedNodeIds.push(capture.node.id);
    return true;
  });

  return captures;
};
