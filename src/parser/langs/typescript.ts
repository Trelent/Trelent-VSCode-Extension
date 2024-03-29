import * as vscode from "vscode";
import { QueryCapture, SyntaxNode, Tree } from "web-tree-sitter";
import { QueryGroup, Function } from "../types";
import { getTextBetweenPoints, getParams } from "../util";

/*
 *   Overall structure of TypeScript captures
 *
 *    @function.docstring
 *    @function.def
 *    @function.name
 *    @function.params
 *    @function.body
 *
 */

export const parseTypeScriptFunctions = (
  captures: QueryCapture[],
  tree: Tree,
  doc?: vscode.TextDocument
): Function[] => {
  const functions: Function[] = [];

  //Get query groups from captures
  const queryGroups: QueryGroup[] = groupFunction(captures);

  queryGroups.forEach((queryGroup) => {
    let defNode: SyntaxNode,
      nameNode: SyntaxNode,
      paramsNode: SyntaxNode,
      bodyNode: SyntaxNode,
      docNode: SyntaxNode | undefined;

    //Grab the 4 required nodes
    defNode = queryGroup.defNode;
    nameNode = queryGroup.nameNode;
    paramsNode = queryGroup.paramsNode;
    bodyNode = queryGroup.bodyNode;

    //If a docNode exists, grab it
    if (queryGroup.docNodes.length > 0) {
      docNode = queryGroup.docNodes[0];
    }
    let func: Function = {
      body: "",
      definition: "",
      definition_line: nameNode.startPosition.row,
      docstring: undefined,
      docstring_offset: defNode.startIndex,
      docstring_range: undefined,
      name: "",
      params: [],
      range: [],
      text: "",
    };

    //Define bounds of the function
    let start = defNode.startIndex;
    let end = defNode.endIndex;

    //Define the fields of the function
    func.body = bodyNode.text;

    func.definition = func.definition = getTextBetweenPoints(
      tree.rootNode.text,
      defNode.startPosition,
      bodyNode.startPosition
    );

    //if there is a docNode present, populate the docstring field
    if (docNode) {
      func.docstring = docNode.text.trim();
      func.docstring_range = [docNode.startIndex, docNode.endIndex];
    }

    func.name = nameNode.text;

    func.params = getParams(paramsNode.text);

    func.range = [start, end];

    func.text = defNode.text;

    functions.push(func);
  });

  return functions;
};

const groupFunction = (captures: QueryCapture[]): QueryGroup[] => {
  let queryGroups: QueryGroup[] = [];
  for (let i = 0; i < captures.length; i++) {
    if (captures[i].name !== "function.def") {
      continue;
    }

    let defNode: QueryCapture | undefined;
    let nameNode: QueryCapture | undefined;
    let paramsNode: QueryCapture | undefined;
    let bodyNode: QueryCapture | undefined;
    let docNode: SyntaxNode[] = [];

    //Init base nodes
    captures.slice(i, i + 4).forEach((capture) => {
      switch (capture.name) {
        case "function.def":
          defNode = capture;
          break;
        case "function.name":
          nameNode = capture;
          break;
        case "function.params":
          paramsNode = capture;
          break;
        case "function.body":
          bodyNode = capture;
          break;
        default:
          console.error(`Found node out of place ${capture.name}`);
          break;
      }
    });

    //verify all necessary nodes exist
    if (!(defNode && nameNode && paramsNode && bodyNode)) {
      console.error(
        `Missing node type (defNode: ${!!defNode}, nameNode: ${!!nameNode}, paramsNode: ${!!paramsNode}, bodyNode: ${!!bodyNode})`
      );
      continue;
    }

    //Grab documentation node if it exists
    if (i - 1 >= 0 && captures[i - 1].name === "function.docstring") {
      docNode = [captures[i - 1].node];
    }

    let queryGroup: QueryGroup = {
      defNode: defNode.node,
      nameNode: nameNode.node,
      paramsNode: paramsNode.node,
      bodyNode: bodyNode.node,
      docNodes: docNode,
    };

    queryGroups.push(queryGroup);
  }
  return queryGroups;
};
