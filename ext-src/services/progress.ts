import * as vscode from "vscode";

export class ProgressService {
  progressBar: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this.progressBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.progressBar.command = "trelent.showProgress";
    this.updateProgress(0);
    this.progressBar.show();
    context.subscriptions.push(this.progressBar);
  }

  public updateProgress(count: number) {
    var newColour =
      count < 100
        ? count < 50
          ? "statusBarItem.errorBackground"
          : "statusBarItem.warningBackground"
        : "statusBarItem.prominentBackground";

    this.progressBar.backgroundColor = new vscode.ThemeColor(newColour);
    this.progressBar.text = `Docs: ${count}%`;
    this.progressBar.tooltip =
      `${count}% of this file has been documented` +
      (count < 100 ? `. Keep going!` : `! Well done!`);
  }
}
