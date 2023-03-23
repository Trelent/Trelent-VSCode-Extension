import * as vscode from "vscode";
import { Range, Language, QueryCapture, Tree } from "web-tree-sitter";
import { getAllFuncsQuery } from "./queries";
import { parsePythonFunctions } from "./langs/python";
import { parseCSharpFunctions } from "./langs/csharp";
import { parseJavaFunctions } from "./langs/java";
import { parseJavaScriptFunctions } from "./langs/javascript";
import { Function } from "./types";
import { parseTypeScriptFunctions } from "./langs/typescript";

export const parseText = async (
  text: string,
  language: Language,
  parser: any,
  tree: Tree | undefined = undefined
) => {
  // Set the parser language
  parser.setLanguage(language);

  //Parse the document
  if (tree) {
    return parser.parse(text, tree) as Tree;
  }
  return parser.parse(text) as Tree;
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

  //Get the parser for the language
  let parser = getParser(lang);

  if (!parser) {
    console.error(`Could not find parser for lang ${lang}`);
    return [];
  }

  let allFunctions = parser(allFuncsCaptures, tree);

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
    typescript: parseTypeScriptFunctions,
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
