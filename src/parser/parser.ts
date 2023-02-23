import * as vscode from "vscode";
import { Language, QueryCapture, SyntaxNode, Tree } from "web-tree-sitter";
import { getAllFuncsQuery, getDocumentedFuncsQuery } from "./queries";
import { Function } from "./types";
import { getParams, getTextBetweenPoints } from "./util";

export const parseDocument = async (
  document: vscode.TextDocument,
  language: Language,
  parser: any
) => {
  // Set the parser language
  parser.setLanguage(language);

  // Parse the document
  return parser.parse(document.getText()) as Tree;
};

export const parseText = async (
  text: string,
  language: Language,
  parser: any
) => {
  // Set the parser language
  parser.setLanguage(language);

  //Parse the document
  return parser.parse(text) as Tree;
};

export const parseFunctions = async (
  tree: Tree,
  lang: string,
  TSLanguage: Language
) => {
  let documentedFuncsQuery = getDocumentedFuncsQuery(lang, TSLanguage);
  let allFuncsQuery = getAllFuncsQuery(lang, TSLanguage);

  if (!documentedFuncsQuery || !allFuncsQuery) {
    console.error("Query not found for language", lang);
    return [];
  }

  let documentedFuncsCaptures = removeDuplicateNodes(
    documentedFuncsQuery.captures(tree.rootNode)
  );
  let allFuncsCaptures = removeDuplicateNodes(
    allFuncsQuery.captures(tree.rootNode)
  );

  let allFunctions = parseAllFunctions(allFuncsCaptures, lang, tree);
  let documentedFunctions = parseDocumentedFunctions(
    documentedFuncsCaptures,
    lang,
    tree
  );

  // Merge the two arrays and remove duplicates where necessary
  let mergedFunctions = allFunctions.concat(documentedFunctions);
  mergedFunctions = removeDuplicateFunctions(mergedFunctions);

  // Return our merged array of functions
  return mergedFunctions;
};

const parseAllFunctions = (
  captures: QueryCapture[],
  lang: string,
  tree: Tree
) => {
  const functions: Function[] = [];

  for (let i = 0; i < captures.length; i++) {
    // We hit a function definition, as we have 4 named
    // captures for every query in every supported language.
    if (i % 4 == 0) {
      let func: Function = {
        body: "",
        definition: "",
        docstring: undefined,
        docstring_point: undefined,
        name: "",
        params: [],
        range: [
          [0, 0],
          [0, 0],
        ],
        text: "",
      };
      let node = captures[i].node;
      let nameNode, paramsNode, bodyNode;

      if (node.namedChildren.length == 1) {
        // JS arrow functions... ugh
        let childNode = node.namedChildren[0];
        nameNode = childNode.namedChildren[0];

        // go deeper lol
        let arrowNode = childNode.namedChildren[1];
        paramsNode = arrowNode.namedChildren[0];
        bodyNode = arrowNode.namedChildren[1];
      } else {
        nameNode = node.namedChildren[0];
        paramsNode = node.namedChildren[1];
        bodyNode = node.namedChildren[2];
      }

      let start = node.startPosition;
      let end = node.endPosition;
      let indentation = 0;
      let name = nameNode.text;
      let paramsText = paramsNode.text;

      let docstringLine = 0;
      if (lang == "python") {
        docstringLine = paramsNode.endPosition.row + 1;
        indentation +=
          bodyNode.startPosition.column;
      } else {
        docstringLine = nameNode.startPosition.row;
        indentation = nameNode.startPosition.column;
      }
      let docstringCol = indentation;
      let docstringPoint = [docstringLine, docstringCol];

      func.body = bodyNode.text;
      func.definition = getTextBetweenPoints(
        tree.rootNode.text,
        node.startPosition,
        bodyNode.startPosition
      );
      func.docstring_point = docstringPoint;
      func.name = name;
      func.params = getParams(paramsText);
      func.range = [
        [start.row, start.column],
        [end.row, end.column],
      ];
      func.text = node.text;

      functions.push(func);
    }
  }

  return functions;
};

const parseDocumentedFunctions = (
  captures: QueryCapture[],
  lang: string,
  tree: Tree
) => {
  const documentedFunctions: Function[] = [];

  for (let i = 0; i < captures.length; i++) {
    if (i % 5 == 0) {
      let defNode: SyntaxNode | undefined;
      let nameNode: SyntaxNode | undefined;
      let paramsNode: SyntaxNode | undefined;
      let bodyNode: SyntaxNode | undefined;
      let docstringNode: SyntaxNode | undefined;

      captures.slice(i, i + 5).forEach((capture) => {
        if (capture.name == "function.def") {
          defNode = capture.node;
        } else if (capture.name == "function.name") {
          nameNode = capture.node;
        } else if (capture.name == "function.params") {
          paramsNode = capture.node;
        } else if (capture.name == "function.body") {
          bodyNode = capture.node;
        } else if (capture.name == "function.docstring") {
          docstringNode = capture.node;
        } else {
          console.error("TRELENT: Unknown capture name", capture.name);
        }
      });

      // if any of those nodes are undefined, skip this function
      if (!defNode || !nameNode || !paramsNode || !bodyNode || !docstringNode) {
        console.warn(
          "TRELENT: Missing node in documented function.. skipping:",
          {
            defNode,
            nameNode,
            paramsNode,
            bodyNode,
            docstringNode,
          }
        );

        continue;
      }

      let func: Function = {
        body: "",
        definition: "",
        docstring: undefined,
        docstring_point: undefined,
        name: "",
        params: [],
        range: [
          [0, 0],
          [0, 0],
        ],
        text: "",
      };
      let node = defNode;

      let start;
      if (lang === "python") {
        start = node.startPosition;
      } else {
        start = docstringNode.startPosition;
      }
      let end = node.endPosition;
      let indentation = 0;
      let name = nameNode.text;
      let paramsText = paramsNode.text;

      let docstringLine = 0;
      if (lang == "python") {
        docstringLine = paramsNode.endPosition.row + 1;
        indentation +=
          bodyNode.startPosition.column - node.startPosition.column;
      } else {
        docstringLine = nameNode.startPosition.row - 1;
      }
      let docstringCol = indentation;
      let docstringPoint = [docstringLine, docstringCol];

      func.body = bodyNode.text;
      func.definition = getTextBetweenPoints(
        tree.rootNode.text,
        node.startPosition,
        bodyNode.startPosition
      );
      func.docstring_point = docstringPoint;
      func.docstring = docstringNode.text;
      func.name = name;
      func.params = getParams(paramsText);
      func.range = [
        [start.row, start.column],
        [end.row, end.column],
      ];
      func.text = node.text;

      documentedFunctions.push(func);
    }
  }

  return documentedFunctions;
};

const removeDuplicateFunctions = (functions: Function[]) => {
  // Keep functions with docstrings over those without
  functions = functions.sort((func1, func2) => {
    if (func1.docstring && !func2.docstring) {
      return -1;
    }
    if (!func1.docstring && func2.docstring) {
      return 1;
    }
    return 0;
  });

  // Now remove duplicates based on the function definition
  let parsedFunctionDefinitions: string[] = [];
  functions = functions.filter((func) => {
    if (parsedFunctionDefinitions.includes(func.definition)) {
      return false;
    }

    parsedFunctionDefinitions.push(func.definition);
    return true;
  });

  return functions;
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
