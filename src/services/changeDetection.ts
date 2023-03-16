import * as vscode from "vscode";
import { Function } from "../parser/types";
var md5 = require("md5")
var levenshtein = require("fast-levenshtein")

export class ChangeDetectionService {
    fileInfo: {[key: string]: Function[]} = {};

    MAX_TRACKING_SIZE = 100;
    
    /* Adds state to the track history of a file. 
    *  new tree is saved to index 0 of the history
    */
    public trackState(doc: vscode.TextDocument, functions: Function[]): number{
        
        let trackID = hashID(doc);
        if(!(trackID in this.fileInfo)){
            this.fileInfo[trackID] = [];
        }
        let changes = this.hasSignificantChanges(doc, functions);
        if(changes > 0){
            this.fileInfo[trackID] = functions
        }
        return changes;
        
    }

    
    public getHistory(doc: vscode.TextDocument): Function[] {
        let trackID = hashID(doc);
        if(!(trackID in this.fileInfo)){
            console.log("ERROR: Could not find history with hash (" + trackID + ")");
            return []
        }
        return this.fileInfo[trackID];
    }

    /**
     * Determines whether or not we should notify the user that their document has been updated, and should be re-documented
     * @param doc 
     * @param functions 
     * @returns 
     */
    public hasSignificantChanges(doc: vscode.TextDocument, functions: Function[]): number{
        let history = this.getHistory(doc)

        const newFunctionVal = 1;
        const functionDeletedVal = 0;
        const functionChangeMult = 1;
        let sum = 0;
        
        //The format of the idMatching object is key: Hash of the name + params, value object with keys "old", and "new"
        let idMatching: {[key: string]: {[key: string]: Function}} = {};

        functions.forEach((func) => {
            let id = md5(func.name + func.params.join(","))
            if(!(id in idMatching)){
                idMatching[id] = {};
            }
            idMatching[id]["new"] = func
        });

        history.forEach((func) => {
            let id = md5(func.name + func.params.join(","))
            if(!(id in idMatching)){
                idMatching[id] = {};
            }
            idMatching[id]["old"] = func
        });

        var ids = Object.keys(idMatching);

        ids.map((id) => {
            return idMatching[id];
        })
        .forEach((functionPair) => {
            if("old" in functionPair){
                //If the function still exists
                if("new" in functionPair){
                    sum += compareFunctions(functionPair["old"], functionPair["new"]) * functionChangeMult;
                }
                //If the function was deleted
                else{
                    sum += functionDeletedVal;
                }
            }
            //If this is a new function
            else{
                sum += newFunctionVal;
            }
        })

        return sum;
    }

}

let compareFunctions = (function1: Function, function2: Function): number => {
    let sum = 0;
    sum += levenshtein.get(function1.body, function2.body);
    sum += levenshtein.get(function1.definition, function2.definition);
    sum += levenshtein.get(function1.text, function2.text);
    return sum;
    
}

let hashID = (doc: vscode.TextDocument): string => {
    return md5(doc.uri.toString())
}