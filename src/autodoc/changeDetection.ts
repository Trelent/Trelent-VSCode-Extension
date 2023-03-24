import * as vscode from "vscode";
import { Function } from "../parser/types";
import * as md5 from "md5";
import * as levenshtein from "fast-levenshtein";

export class ChangeDetectionService {
  fileInfo: {
    [key: string]: {
      allFunctions: Function[];
      updates: { [key: string]: Function[] };
    };
  } = {};

  levenshtein_update_threshold: number = 50;

  constructor() {
    // Configure the change threshold, and make sure we listen to
    // changes to the configuration users may make in the future.
    this.refreshThreshold();
    vscode.workspace.onDidChangeConfiguration(this.refreshThreshold);
  }

  private refreshThreshold = () => {
    const trelentConfig = vscode.workspace.getConfiguration("trelent");
    const autodocThreshold = trelentConfig.get("autodoc.changeThreshold");
    switch (autodocThreshold) {
      case "Passive":
        this.levenshtein_update_threshold = 250;
        break;
      case "Neutral":
        this.levenshtein_update_threshold = 150;
        break;
      case "Aggressive":
        this.levenshtein_update_threshold = 50;
        break;
      default:
        // Default to passive
        this.levenshtein_update_threshold = 250;
        break;
    }
  };

  public trackState(doc: vscode.TextDocument, functions: Function[]) {
    let trackID = hashID(doc);
    if (!(trackID in this.fileInfo)) {
      this.fileInfo[trackID] = {
        allFunctions: functions,
        updates: { new: [], deleted: [], updated: [] },
      };
    }
    let updateThese = this.getChangedFunctions(doc, functions);
    this.fileInfo[trackID] = { allFunctions: functions, updates: updateThese };
    return updateThese;
  }

  public getHistory(doc: vscode.TextDocument): {
    allFunctions: Function[];
    updates: { [key: string]: Function[] };
  } {
    let trackID = hashID(doc);
    if (!(trackID in this.fileInfo)) {
      console.error("Could not find history with hash (" + trackID + ")");
      return {
        allFunctions: [],
        updates: { new: [], deleted: [], updated: [] },
      };
    }
    return this.fileInfo[trackID];
  }

  /**
   * Determines whether or not we should notify the user that their document has been updated, and should be re-documented
   * @param doc
   * @param functions
   * @returns
   */
  private getChangedFunctions(
    doc: vscode.TextDocument,
    functions: Function[]
  ): { [key: string]: Function[] } {
    let history = this.getHistory(doc).allFunctions;

    let returnObj: { [key: string]: Function[] } = {
      new: [],
      deleted: [],
      updated: [],
    };

    //The format of the idMatching object is key: Hash of the name + params, value object with keys "old", and "new"
    let idMatching: { [key: string]: { [key: string]: Function } } = {};

    //Fill idMatching with new functions
    functions.forEach((func) => {
      let id = hashFunction(func);
      if (!(id in idMatching)) {
        idMatching[id] = {};
      }
      idMatching[id]["new"] = func;
    });

    history.forEach((func: Function) => {
      let id = hashFunction(func);
      if (!(id in idMatching)) {
        idMatching[id] = {};
      }
      idMatching[id]["old"] = func;
    });

    var ids = Object.keys(idMatching);

    ids.forEach((id) => {
      let functionPair = idMatching[id];
      if ("old" in functionPair) {
        //If the function still exists
        if ("new" in functionPair) {
          if (
            compareFunctions(functionPair["old"], functionPair["new"]) >
            this.levenshtein_update_threshold
          ) {
            returnObj.updated.push(functionPair["new"]);
          }
        }
        //If the function was deleted
        else {
          returnObj.deleted.push(functionPair["old"]);
        }
      }
      //If this is a new function
      else {
        returnObj.new.push(functionPair["new"]);
      }
    });

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
    return md5(doc.uri.path.toString())
}