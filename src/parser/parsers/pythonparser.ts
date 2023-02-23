import { QueryCapture, SyntaxNode, Tree } from "web-tree-sitter";
import { QueryGroup, Function } from "../types";

/*
*   Overall structure of Python captures
*   
*    @function.def
*    @function.name
*    @function.params
*    @function.body
*    @function.docstring
*/

export const parsePythonFunctions = (
    captures: QueryCapture[],
    tree: Tree
) => {
    const functions: Function[] = [];

    const queryGroups: QueryGroup[] = groupFunction(captures);

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
}

const groupFunction = (captures: QueryCapture[]): QueryGroup[] => {
    let queryGroups: QueryGroup[] = [];
    for(let i = 0; i<captures.length; i++){
        if(captures[i].name !== "function.def"){
            continue;
        }
        let defNode, nameNode, paramsNode, bodyNode, docNode: SyntaxNode[] = [];

        //Init base nodes
        captures.slice(i, i+4).forEach(capture => {
            switch(capture.name){
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
        if(!(defNode && nameNode && paramsNode && bodyNode)){
            console.error(`Missing node type (defNode: ${!!defNode}, nameNode: ${!!nameNode}, paramsNode: ${!!paramsNode}, bodyNode: ${!!bodyNode})`);
            continue;
        }
        //Grab documentation node if it exists
        if(i+4 < captures.length && captures[i+4].name === "function.docstring"){
            docNode = [captures[i+4].node];
        }

        let queryGroup: QueryGroup = {
            defNode: defNode.node,
            nameNode: nameNode.node,
            paramsNode: paramsNode.node,
            bodyNode: bodyNode.node,
            docNodes: docNode
        }

    }
    return queryGroups;
}