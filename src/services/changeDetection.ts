import * as vscode from "vscode";
import { Function } from "../parser/types";
var md5 = require("md5")
var levenshtein = require("fast-levenshtein")

export class ChangeDetectionService {
    fileInfo: {[key: string]: Function[]} = {};
    docstringRecommendations: {[key: string]: string} = {};

    MAX_TRACKING_SIZE = 100;

    UPDATE_THRESHOLD = 50;
    
    /* Adds state to the track history of a file. 
    *  new tree is saved to index 0 of the history
    */
    public trackState(doc: vscode.TextDocument, functions: Function[]){
        
        let trackID = hashID(doc);
        let shouldNotify = true;
        if(!(trackID in this.fileInfo)){
            this.fileInfo[trackID] = [];
            shouldNotify = false;
        }
        return this.getChangedFunctions(doc, functions);
        
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
    public getChangedFunctions(doc: vscode.TextDocument, functions: Function[]): Function[]{
        let history = this.getHistory(doc)

        //If we have no history for this file, we should not update documentation
        if(history.length == 0){
            return [];
        }
        //The format of the idMatching object is key: Hash of the name + params, value object with keys "old", and "new"
        let idMatching: {[key: string]: {[key: string]: Function}} = {};

        let docstringUpdates: Function[] = [];

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

        ids.forEach((id) => {
            let functionPair = idMatching[id];
            if("old" in functionPair){
                //If the function still exists
                if("new" in functionPair){
                    if(compareFunctions(functionPair["old"], functionPair["new"]) > this.UPDATE_THRESHOLD){
                        docstringUpdates.push(functionPair["new"]);
                    }
                }
                //If the function was deleted, delete the docstring recommendation
                else{
                    try{
                        delete this.docstringRecommendations[id];
                    }
                    catch(e){
                        console.log("Error deleting function with hash: " + id);
                    }
                }
            }
            //If this is a new function
            else{
                docstringUpdates.push(functionPair["new"]);
            }
        })

        return docstringUpdates;
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