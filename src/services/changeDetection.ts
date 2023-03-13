import * as vscode from "vscode";
import { Tree } from "web-tree-sitter";
var md5 = require("md5")

export class ChangeDetectionService {
    fileInfo: {[key: string]: Tree[]} = {};

    MAX_TRACKING_SIZE = 100;

    public async trackState(doc: vscode.TextDocument, tree: Tree){
        let trackID = hashID(doc);
        console.log("ID: " + trackID);
        if(!(trackID in this.fileInfo)){
            this.fileInfo[trackID] = [];
        }
        let queue = this.fileInfo[trackID]
        while(queue.length >= this.MAX_TRACKING_SIZE){
            queue.shift();
        }
        queue.push(tree);
    }

    public async getHistory(doc: vscode.TextDocument){
        let trackID = hashID(doc);
        return this.fileInfo[trackID];
    }


    //TODO: Remove files automatically when they are deleted

}

let hashID = (doc: vscode.TextDocument): string => {
    return md5(doc.uri.toString())
}