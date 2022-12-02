import * as vscode from "vscode";

export class DevService {
  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand("trelent.dev.clearTrelentContext", () => {
        this.clearTrelentContext(context);
      })
    );
  }

  public clearTrelentContext(context: vscode.ExtensionContext) {
    context.globalState.update("Trelent.trelent", undefined);
    vscode.window.showInformationMessage("Trelent context cleared!");
  }
}
