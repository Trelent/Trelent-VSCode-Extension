import * as vscode from "vscode";
import { Function } from "../parser/types";
import * as md5 from "md5";
import * as levenshtein from "fast-levenshtein";
import { Edit, Point, Tree } from "web-tree-sitter";

export class ChangeDetectionService {
  openDocuments: {
    [key: string]: {
      allFunctions: Function[];
    };
  } = {};
  private changedFunctions: { [key: string]: { [key: number]: Function } } = {};

  openDocumentTrees: {
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
        this.levenshtein_update_threshold = 1000;
        break;
      case "Neutral":
        this.levenshtein_update_threshold = 500;
        break;
      case "Aggressive":
        this.levenshtein_update_threshold = 250;
        break;
      default:
        // Default to passive
        this.levenshtein_update_threshold = 1000;
        break;
    }
  };

  public trackState(
    doc: vscode.TextDocument,
    functions: Function[],
    tree: Tree
  ) {
    let documentId = hashDocumentPath(doc);
    if (!(documentId in this.openDocuments)) {
      this.openDocuments[documentId] = {
        allFunctions: functions,
      };
    }

    let functionsToUpdate = this.getChangedFunctions(doc, functions);

    // Remove deleted functions from docstring recommendations
    functionsToUpdate.deleted.forEach((func) => {
      this.deleteChangedFunctionForDocument(doc, func);
    });

    // Update function updates
    Object.keys(functionsToUpdate)
      .filter((title) => title != "deleted" && title != "all")
      .flatMap((title) => functionsToUpdate[title])
      .forEach((func) => {
        this.addChangedFunctionForDocument(doc, func);
      });

    this.openDocuments[documentId] = {
      allFunctions: functionsToUpdate["all"],
    };
    this.openDocumentTrees[documentId] = tree;
    return functionsToUpdate;
  }

  public closeFile(doc: vscode.Uri) {
    let documentId = hashUri(doc);
    delete this.openDocuments[documentId];
    delete this.openDocumentTrees[documentId];
  }

  public updateRange(
    doc: vscode.TextDocument,
    changes: readonly vscode.TextDocumentContentChangeEvent[]
  ) {
    let documentId = hashDocumentPath(doc);
    let edits: Edit[] = [];
    let tree = this.openDocumentTrees[documentId];
    if (!tree) {
      return;
    }
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
    if (this.openDocuments[documentId]) {
      this.openDocuments[documentId].allFunctions.forEach((func) => {
        updateFunctionRange(func, edits);
      });
    }
    this.refreshDocChanges(doc);
  }

  private refreshDocChanges(doc: vscode.TextDocument) {
    let documentId = hashDocumentPath(doc);

    // Skip if the document is no longer open
    if (!(documentId in this.changedFunctions)) {
      this.changedFunctions[documentId] = {};
    }

    let changedFunctions = Object.values(this.changedFunctions[documentId]);
    for (let index in this.changedFunctions[documentId]) {
      delete this.changedFunctions[documentId][index];
    }

    changedFunctions.forEach((func) => {
      this.changedFunctions[hashFunction(func)] = func;
    });
  }

  public getDocumentFunctionData(doc: vscode.TextDocument): {
    allFunctions: Function[];
    tree: Tree | undefined;
  } {
    let documentId = hashDocumentPath(doc);
    if (!(documentId in this.openDocuments)) {
      return {
        allFunctions: [],
        tree: undefined,
      };
    }
    return {
      ...this.openDocuments[documentId],
      tree: this.openDocumentTrees[documentId],
    };
  }

  public getChangedFunctionsForDocument(doc: vscode.TextDocument): {
    [key: number]: Function;
  } {
    let documentId = hashDocumentPath(doc);
    if (!(documentId in this.changedFunctions)) {
      this.changedFunctions[documentId] = {};
    }
    return this.changedFunctions[documentId];
  }

  public deleteChangedFunctionForDocument(
    doc: vscode.TextDocument,
    func: Function
  ) {
    let funcId = hashFunction(func);
    let documentId = hashDocumentPath(doc);

    // Reset lev distance sum to 0 when a change is ignored
    this.openDocuments[documentId].allFunctions = this.openDocuments[
      documentId
    ].allFunctions.filter((f) => hashFunction(f) != funcId);

    this.openDocuments[documentId].allFunctions.push({
      ...func,
      levenshteinDistanceSum: 0,
    });

    // Delete the function from the doc changes list
    let docChanges = this.getChangedFunctionsForDocument(doc);
    if (docChanges[funcId]) {
      delete docChanges[funcId];
      return true;
    }
    return false;
  }

  public addChangedFunctionForDocument(
    doc: vscode.TextDocument,
    func: Function
  ): boolean {
    let docChanges = this.getChangedFunctionsForDocument(doc);
    let funcId = hashFunction(func);
    docChanges[funcId] = func;
    return docChanges[funcId] != undefined;
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
    let history = this.getDocumentFunctionData(doc).allFunctions;

    let returnObj: { [key: string]: Function[] } = {
      all: functions,
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

    //Fil idMatching with old functions
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
          // Calculate the levenshtein distance between the old and new function
          const newLevDistance = compareFunctions(
            functionPair["old"],
            functionPair["new"]
          );

          // Remove the previous version of the function from the history
          returnObj.all = returnObj.all.filter(
            (f) => hashFunction(f) != hashFunction(functionPair["old"])
          );

          // Backfill the levenshtein distance sum for the new function into the file history
          let funcWithLevenshteinDistance: Function = {
            ...functionPair["new"],
            levenshteinDistanceSum: newLevDistance,
          };
          returnObj.all.push(funcWithLevenshteinDistance);

          if (newLevDistance > this.levenshtein_update_threshold) {
            // If beyond the threshold, add to updated list
            console.log(
              "Updated function: " + funcWithLevenshteinDistance.name,
              "passed",
              this.levenshtein_update_threshold
            );
            returnObj.updated.push(funcWithLevenshteinDistance);
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
        returnObj.all.push(functionPair["new"]);
      }
    });

    return returnObj;
  }
}

let updateFunctionRange = (func: Function, changes: Edit[]) => {
  // Offset vars
  let totDocTopOffset = 0,
    totDocBottomOffset = 0,
    totDocstringPointOffset = 0,
    totFuncTopOffset = 0,
    totFuncBottomOffset = 0,
    totDefLineOffset = 0;

  changes.forEach((edit) => {
    // Init needed values lmao
    let offsetDiff = edit.newEndIndex - edit.oldEndIndex;
    let lineOffset = edit.newEndPosition.row - edit.oldEndPosition.row;
    let bottomOffset = func.range[1];

    // If the changes happened above the function, we need to update the range
    if (edit.oldEndIndex <= bottomOffset) {
      //Check if the docstring was affected
      if (func.docstring_range) {
        //Determine if either of the docstring range points were affected
        if (edit.oldEndIndex <= func.docstring_range[0]) {
          totDocTopOffset += offsetDiff;
        }
        if (edit.oldEndIndex <= func.docstring_range[1]) {
          totDocBottomOffset += offsetDiff;
        }
      }

      //Check if the docstring point was affected
      if (edit.oldEndIndex <= func.docstring_offset) {
        totDocstringPointOffset += offsetDiff;
      }

      //Determine if either of the function range points were affected
      if (edit.oldEndIndex <= func.range[0]) {
        totFuncTopOffset += offsetDiff;
      }
      if (edit.oldEndIndex <= func.range[1]) {
        totFuncBottomOffset += offsetDiff;
      }

      //Check if defline was affected
      if (edit.oldEndPosition.row <= func.definition_line) {
        totDefLineOffset += lineOffset;
      }
    }
  });
  if (func.docstring_range) {
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

let compareFunctions = (function1: Function, function2: Function): number => {
  let sum = function1.levenshteinDistanceSum || 0;
  sum += levenshtein.get(function1.body, function2.body);
  return sum;
};

export let hashFunction = (func: Function): number => {
  return func.definition_line;
};

export let hashDocumentPath = (doc: vscode.TextDocument): string => {
  return md5(doc.uri.path.toString());
};

export let hashUri = (uri: vscode.Uri): string => {
  return md5(uri.path.toString());
};

let changeDetectionService: ChangeDetectionService =
  new ChangeDetectionService();

export let getChangeDetectionService = () => {
  return changeDetectionService;
};
