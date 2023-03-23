import * as vscode from "vscode";
import { Function } from "../parser/types";
import * as md5 from "md5";
import * as levenshtein from "fast-levenshtein";
import { Edit, Point, Tree } from "web-tree-sitter";

export class ChangeDetectionService {
  fileInfo: {
    [key: string]: {
      allFunctions: Function[];
      updates: { [key: string]: Function[] };
    };
  } = {};

  treeHistory: {
    [key: string]: Tree;
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

  public trackState(
    doc: vscode.TextDocument,
    functions: Function[],
    tree: Tree
  ) {
    let trackID = hashID(doc);
    if (!(trackID in this.fileInfo)) {
      this.fileInfo[trackID] = {
        allFunctions: functions,
        updates: { new: [], deleted: [], updated: [] },
      };
    }
    let updateThese = this.getChangedFunctions(doc, functions);
    this.fileInfo[trackID] = { allFunctions: functions, updates: updateThese };
    this.treeHistory[trackID] = tree;
    return updateThese;
  }

  public updateRange(
    doc: vscode.TextDocument,
    changes: vscode.TextDocumentContentChangeEvent[]
  ) {
    let docId = hashID(doc);
    if (this.treeHistory[docId]) {
      let tree = this.treeHistory[docId];
      changes.forEach((change) => {
        let startIndex = change.rangeOffset;
        let oldEndIndex = startIndex + change.rangeLength;
        let newEndIndex = startIndex + change.text.length;
        let startPosition: Point = {
          row: change.range.start.line,
          column: change.range.start.character,
        };
        let oldEndPosition: Point = {
          row: change.range.end.line,
          column: change.range.end.character,
        };
        let vscodeEnd = doc.positionAt(newEndIndex);
        let newEndPosition: Point = {
          row: vscodeEnd.line,
          column: vscodeEnd.character,
        };
        tree.edit({
          startIndex: startIndex,
          oldEndIndex: oldEndIndex,
          newEndIndex: newEndIndex,
          startPosition: startPosition,
          oldEndPosition: oldEndPosition,
          newEndPosition: newEndPosition,
        });
      });
    }
  }

  public getHistory(doc: vscode.TextDocument): {
    allFunctions: Function[];
    updates: { [key: string]: Function[] };
    tree: Tree | undefined;
  } {
    let trackID = hashID(doc);
    if (!(trackID in this.fileInfo)) {
      console.error("Could not find history with hash (" + trackID + ")");
      return {
        allFunctions: [],
        updates: { new: [], deleted: [], updated: [] },
        tree: undefined,
      };
    }
    return { ...this.fileInfo[trackID], tree: this.treeHistory[trackID] };
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
};

export let hashFunction = (func: Function): string => {
  return md5(func.name + func.params.join(","));
};

export let hashID = (doc: vscode.TextDocument): string => {
  return md5(doc.uri.path.toString());
};
