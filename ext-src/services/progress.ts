import * as vscode from "vscode";
import { CodeParserService } from "./codeParser";
import { Function } from "../parser/types";

export class ProgressService {
  progressBar: vscode.StatusBarItem;
  parser: CodeParserService;

  constructor(context: vscode.ExtensionContext, parser: CodeParserService) {
    this.parser = parser;

    this.progressBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.progressBar.text = "File 0% Documented";
    this.progressBar.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground"
    );
    this.refresh();

    context.subscriptions.push(this.progressBar);

    vscode.window.onDidChangeActiveTextEditor(this.refreshSoon);
    vscode.workspace.onDidSaveTextDocument(this.refreshSoon);
    vscode.workspace.onDidOpenTextDocument(this.refreshSoon);
  }

  refreshSoon = () => {
    setTimeout(() => this.refresh(), 500);
  };

  public refresh() {
    let functions = this.parser.getFunctions();
    let totalFunctions = functions.length;

    if (totalFunctions == 0) {
      this.progressBar.text = "File 0% Documented";
      return;
    }

    let documentedFunctions = functions.filter(
      (f) => f.docstring != undefined
    ).length;
    let percentage = Math.round((documentedFunctions / totalFunctions) * 100);

    this.progressBar.text = `File ${percentage}% documented`;

    if (percentage == 0) {
      this.progressBar.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.errorBackground"
      );
    } else if (percentage > 0 && percentage < 100) {
      this.progressBar.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground"
      );
    } else {
      this.progressBar.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.successBackground"
      );
    }

    this.progressBar.show();
  }

  getDocCoverage = async (funcs: Function[]): Promise<number> => {
    // get fraction of functions with docstrings
    let docCount = 0;
    for (let func of funcs) {
      if (func.docstring) docCount++;
    }
    let docCoverage = docCount / (funcs.length - 1);

    return docCoverage;
  };
}
