import * as vscode from "vscode";
import { Function } from "../parser/types";
var md5 = require("md5")
var levenshtein = require("fast-levenshtein")

export class ChangeDetectionService {
    fileInfo: {[key: string]: Function[]} = {};

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
        let updateThese = this.getChangedFunctions(doc, functions);
        this.fileInfo[trackID] = functions;
        return updateThese
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
    public getChangedFunctions(doc: vscode.TextDocument, functions: Function[]): {[key: string]: Function[]}{
        let history = this.getHistory(doc)

        let returnObj: {[key: string]: Function[]} = {
            "new": [], 
            "deleted": [], 
            "updated": []
        };

        //If we have no history for this file, we should not update documentation
        if(history.length == 0){
            return returnObj;
        }
        //The format of the idMatching object is key: Hash of the name + params, value object with keys "old", and "new"
        let idMatching: {[key: string]: {[key: string]: Function}} = {};

        functions.forEach((func) => {
            let id = hashFunction(func);
            if(!(id in idMatching)){
                idMatching[id] = {};
            }
            idMatching[id]["new"] = func
        });

        history.forEach((func) => {
            let id = hashFunction(func);
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
                        returnObj.updated.push(functionPair["new"]);
                    }
                }
                //If the function was deleted
                else{
                    returnObj.deleted.push(functionPair["old"]);
                }
            }
            //If this is a new function
            else{
                returnObj.new.push(functionPair["new"]);
            }
        })

        return returnObj;
    }

}

let compareFunctions = (function1: Function, function2: Function): number => {
    let sum = 0;
    sum += levenshtein.get(function1.body, function2.body);
    sum += levenshtein.get(function1.definition, function2.definition);
    sum += levenshtein.get(function1.text, function2.text);
    return sum;
    
}

export let hashFunction = (func: Function): string => {
    return md5(func.name + func.params.join(","))
}

export let hashID = (doc: vscode.TextDocument): string => {
    return md5(doc.uri.toString())
}