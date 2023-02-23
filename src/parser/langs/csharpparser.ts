import { QueryCapture, SyntaxNode, Tree } from "web-tree-sitter";
import { QueryGroup, Function } from "../types";
import { getTextBetweenPoints, getParams } from "../util"

/*
*   Overall structure of C# captures
*
*    (@function.docstrings) any amount
*    @function.def
*    @function.name
*    @function.params
*    @function.body
*    
*/

export const parseCSharpFunctions = (
    captures: QueryCapture[],
    tree: Tree
): Function[] => {
    const functions: Function[] = [];

    //Get query groups from captures
    const queryGroups: QueryGroup[] = groupFunction(captures);

    queryGroups.forEach(queryGroup => {

    let defNode: SyntaxNode, nameNode: SyntaxNode, paramsNode: SyntaxNode, bodyNode: SyntaxNode, docNodes: SyntaxNode[];


    //Grab the 4 required nodes
    defNode = queryGroup.defNode;
    nameNode = queryGroup.nameNode;
    paramsNode = queryGroup.paramsNode;
    bodyNode = queryGroup.bodyNode;
    docNodes = queryGroup.docNodes;

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

    //Define bounds of the function
    let start = defNode.startPosition;
    let end = defNode.endPosition;

    //Determine position where docstring should be inserted
    let docstringLine = nameNode.startPosition.row;
    let docstringCol = nameNode.startPosition.column;

    let docstringPoint = [docstringLine, docstringCol];

    //Define the fields of the function
    func.body = bodyNode.text;

    func.definition = func.definition = getTextBetweenPoints(
        tree.rootNode.text,
        defNode.startPosition,
        bodyNode.startPosition
    );
    
    //if there is a docNode present, populate the docstring field
    if(docNodes.length > 0){
        let docText = "";
        docNodes.forEach(docNode => {
            docText += docNode.text + "\n";
        });
        //Chop off trailing newline
        docText = docText.substring(0, docText.length - 2);
        func.docstring = docText;
    }

    func.docstring_point = docstringPoint;

    func.name = nameNode.text;

    func.params = getParams(paramsNode.text);

    func.range = [
        [start.row, start.column],
        [end.row, end.column]
    ];

    func.text = defNode.text;

    functions.push(func);
    });

    return functions;
}

const groupFunction = (captures: QueryCapture[]): QueryGroup[] => {
    let queryGroups: QueryGroup[] = [];
    for(let i = 0; i<captures.length; i++){

        let docNodes: SyntaxNode[] = [];
        while(i < captures.length && captures[i].name === "function.docstrings"){
            docNodes.push(captures[i++].node);
        }

        if(captures[i].name !== "function.def"){
            continue;
        }

        let defNode: QueryCapture | undefined
        let nameNode: QueryCapture | undefined
        let paramsNode: QueryCapture | undefined 
        let bodyNode: QueryCapture | undefined

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
        
        //verify all necessary nodes exist
        if(!(defNode && nameNode && paramsNode && bodyNode)){
            console.error(`Missing node type (defNode: ${!!defNode}, nameNode: ${!!nameNode}, paramsNode: ${!!paramsNode}, bodyNode: ${!!bodyNode})`);
            continue;
        }

        let queryGroup: QueryGroup = {
            defNode: defNode.node,
            nameNode: nameNode.node,
            paramsNode: paramsNode.node,
            bodyNode: bodyNode.node,
            docNodes: docNodes
        };

        queryGroups.push(queryGroup);

    }
    return queryGroups;
}