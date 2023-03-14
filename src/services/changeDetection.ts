import * as vscode from "vscode";
import { Tree } from "web-tree-sitter";
var md5 = require("md5")

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
        console.log(JSON.stringify(tree).length);
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
        if(history.length <= 1){
            return false;
        }
        let newestTree = history[0];
        for(let i = 1; i<history.length; i++){
            if(compareTrees(newestTree, history[i])){
                return true;
            }
        }
        return false;
    }


    //TODO: Remove files automatically when they are deleted

}

let compareTrees = (tree1: Tree, tree2: Tree) => {
    return false;
}

let hashID = (doc: vscode.TextDocument): string => {
    return md5(doc.uri.toString())
}