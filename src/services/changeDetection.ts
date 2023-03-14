import * as vscode from "vscode";
import { SyntaxNode, Tree } from "web-tree-sitter";
import { TreeRef } from "../parser/types";
var md5 = require("md5")
var ed = require("edit-distance")

export class ChangeDetectionService {
    fileInfo: {[key: string]: Tree[]} = {};

    MAX_TRACKING_SIZE = 100;
    


    /* Adds state to the track history of a file. 
    *  new tree is saved to index 0 of the history
    */
    public async trackState(doc: vscode.TextDocument, tree: Tree){
        
        let trackID = hashID(doc);
        console.log("ID: " + trackID);
        if(!(trackID in this.fileInfo)){
            this.fileInfo[trackID] = [];
        }
        let queue = this.fileInfo[trackID]
        while(queue.length >= this.MAX_TRACKING_SIZE){
            queue.splice(-1);
        }
        queue.unshift(tree);
        
    }

    public getHistory(doc: vscode.TextDocument){
        let trackID = hashID(doc);
        if(!(trackID in this.fileInfo)){
            console.log("ERROR: Could not find history with hash (" + trackID + ")");
            return []
        }
        return this.fileInfo[trackID];
    }

    public shouldUpdateDocstrings(doc: vscode.TextDocument): boolean{
        let history = this.getHistory(doc)
        console.log(history.length);
        if(history.length <= 1){
            return false;
        }
        let newestTree = history[0];
        for(let i = 1; i<history.length; i++){
            let distance = compareTrees(newestTree, history[i]);
            console.log("distance = " + distance);
            if(compareTrees(newestTree, history[i])){
                return true;
            }
        }
        return false;
    }


    //TODO: Remove files automatically when they are deleted

}

let compareTrees = (tree1: Tree, tree2: Tree): number => {
    let time = Date.now();
    let insert, remove, update, children;
    insert = remove = function(node: TreeRef) { return 1; }
    update = function(nodeA: TreeRef, nodeB: TreeRef) { return nodeA.id !== nodeB.id ? 1 : 0; }
    children = function(node: TreeRef) { 
        return node.children; }

    
    var ted = ed.ted(translateTree(tree1.rootNode), translateTree(tree2.rootNode), children, insert, remove, update);
    console.log("Time = " + (Date.now() - time))
    return ted.distance
}

let translateTree = (node: SyntaxNode) => {
    
    let newChildren: TreeRef[] = []
    node.children.forEach((child: SyntaxNode) => {
        console.log("Processing child: " + child.id);
        newChildren.push(translateTree(child));
    })
    let obj: TreeRef = {
        id: node.id,
        children: newChildren
    }
    return obj;
}

let hashID = (doc: vscode.TextDocument): string => {
    return md5(doc.uri.toString())
}