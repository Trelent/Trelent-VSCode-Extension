import * as vscode from "vscode";
import { Function } from "../parser/types";
import * as md5 from "md5";
import * as levenshtein from "fast-levenshtein";
import { Edit, Point, Tree } from "web-tree-sitter";
import { getCodeParserService } from "../services/codeParser";

export class ChangeDetectionService {
  fileInfo: {
    [key: string]: {
      allFunctions: Function[];
      updates: { [key: string]: Function[] };
    };
  } = {};
  private changedFunctions: { [key: string]: { [key: number]: Function } } = {};

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
    // Remove deleted functions from docstring recommendations
    updateThese.deleted.forEach((func) => {
      this.deleteDocChange(doc, func);
    });

    // Update function updates
    Object.keys(updateThese)
      .filter((title) => title != "deleted")
      .flatMap((title) => updateThese[title])
      .forEach((func) => {
        this.addDocChange(doc, func);
      });

    this.fileInfo[trackID] = { allFunctions: functions, updates: updateThese };
    this.treeHistory[trackID] = tree;
    return updateThese;
  }

  public updateRange(
    doc: vscode.TextDocument,
    changes: readonly vscode.TextDocumentContentChangeEvent[]
  ) {
    let docId = hashID(doc);
    let edits: Edit[] = [];
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
      let edit = {
        startIndex: startIndex,
        oldEndIndex: oldEndIndex,
        newEndIndex: newEndIndex,
        startPosition: startPosition,
        oldEndPosition: oldEndPosition,
        newEndPosition: newEndPosition,
      };
      tree.edit(edit);
      edits.push(edit);
    });
    if (this.fileInfo[docId]) {
      this.fileInfo[docId].allFunctions.forEach((func) => {
        updateFunctionRange(doc, func, edits);
      });
    }
    this.refreshDocChanges(doc);
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

  public getDocChanges(doc: vscode.TextDocument): { [key: number]: Function } {
    let trackID = hashID(doc);
    if (!(trackID in this.changedFunctions)) {
      console.error("Could not find history with hash (" + trackID + ")");
      this.changedFunctions[trackID] = {};
    }
    return this.changedFunctions[trackID];
  }

  public deleteDocChange(doc: vscode.TextDocument, func: Function) {
    let funcId = hashFunction(func);
    let docChanges = this.getDocChanges(doc);
    if (docChanges[funcId]) {
      delete docChanges[funcId];
      return true;
    }
    return false;
  }

  public addDocChange(doc: vscode.TextDocument, func: Function): boolean {
    let docChanges = this.getDocChanges(doc);
    let funcId = hashFunction(func);
    docChanges[funcId] = func;
    return docChanges[funcId] != undefined;
  }

  private refreshDocChanges(doc: vscode.TextDocument) {
    let trackID = hashID(doc);
    if (!(trackID in this.changedFunctions)) {
      console.error("Could not find history with hash (" + trackID + ")");
      this.changedFunctions[trackID] = {};
    }
    let changedFunctions = Object.values(this.changedFunctions[trackID]);
    for (let index in this.changedFunctions[trackID])
      delete this.changedFunctions[trackID][index];
    changedFunctions.forEach((func) => {
      this.changedFunctions[hashFunction(func)] = func;
    });
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

let updateFunctionRange = (
  doc: vscode.TextDocument,
  func: Function,
  changes: Edit[]
) => {
  let totDocTopOffset = 0,
    totDocBottomOffset = 0,
    totDocstringPointOffset = 0,
    totFuncTopOffset = 0,
    totFuncBottomOffset = 0,
    totDefLineOffset = 0;

  //Define vars

  changes.forEach((edit) => {
    //Init needed values lmao
    let offsetDiff = edit.newEndIndex - edit.oldEndIndex;
    let bottomOffset = func.range[1];

    // If the changes happened above the function, we need to update the range
    if (edit.startIndex <= bottomOffset) {
      //Check if the docstring was affected
      if (func.docstring_range) {
        //Determine if either of the docstring range points were affected
        if (edit.startIndex <= func.docstring_range[0]) {
          totDocTopOffset += offsetDiff;
        }
        if (edit.startIndex <= func.docstring_range[1]) {
          totDocBottomOffset += offsetDiff;
        }
      }

      //Check if the docstring point was affected
      if (func.docstring_offset && edit.startIndex <= func.docstring_offset) {
        totDocstringPointOffset += offsetDiff;
      }

      //Determine if either of the function range points were affected
      if (edit.startIndex <= func.range[0]) {
        totFuncTopOffset += offsetDiff;
      }
      if (edit.startIndex <= func.range[1]) {
        totFuncBottomOffset += offsetDiff;
      }

      //Check if defline was affected
      totDefLineOffset += edit.newEndPosition.row - edit.oldEndPosition.row;
    }
  });
  if (totDocTopOffset + totDocBottomOffset != 0 && func.docstring_range) {
    //Define the docstring range in terms of offsets

    func.docstring_range[0] += totDocTopOffset;
    func.docstring_range[1] += totDocBottomOffset;
  }
  if (func.docstring_offset) {
    func.docstring_offset += totDocstringPointOffset;
  }

  func.range[0] += totFuncTopOffset;
  func.range[1] += totFuncBottomOffset;

  func.definition_line += totDefLineOffset;
};

export let hashFunction = (func: Function): number => {
  return func.definition_line;
};

export let hashID = (doc: vscode.TextDocument): string => {
  return md5(doc.uri.path.toString());
};
