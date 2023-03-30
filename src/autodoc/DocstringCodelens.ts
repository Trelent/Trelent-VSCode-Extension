import * as vscode from "vscode";
import { Function } from "../parser/types";
import { CancellationToken } from "vscode";

export default class DocstringCodelens implements vscode.Disposable {
  private codeLensRegistrationHandle?: vscode.Disposable | null;
  private provider: AutodocCodelensProvider;

  constructor() {
    console.log("DocstringCodelens.begin");
    this.provider = new AutodocCodelensProvider();
    this.codeLensRegistrationHandle = vscode.languages.registerCodeLensProvider(
      [
        { scheme: "file" },
        { scheme: "vscode-vfs" },
        { scheme: "untitled" },
        { scheme: "vscode-userdata" },
      ],
      this.provider
    );
  }

  dispose() {
    if (this.codeLensRegistrationHandle) {
      this.codeLensRegistrationHandle.dispose();
      this.codeLensRegistrationHandle = null;
    }
  }

  public updateCodeLenses(highlightedFunctions: Function[]) {
    this.provider.highlightedFunctions = highlightedFunctions;
    this.provider.reload();
  }
}

class AutodocCodelensProvider implements vscode.CodeLensProvider {
  private readonly _onChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onChangeCodeLensesEmitter.event;

  reload() {
    this._onChangeCodeLensesEmitter.fire();
  }
  public highlightedFunctions: Function[] = [];

  async provideCodeLenses(
    document: vscode.TextDocument,
    token: CancellationToken
  ): Promise<vscode.CodeLens[] | null> {
    const items: vscode.CodeLens[] = [];

    this.highlightedFunctions.forEach((func: Function) => {
      const updateDocstringCommand: vscode.Command = {
        command: "trelent.autodoc.update",
        title: vscode.l10n.t("Update docstring"),
        arguments: [document, func],
      };

      const ignoreCommand: vscode.Command = {
        command: "trelent.autodoc.ignore",
        title: vscode.l10n.t("Ignore"),
        arguments: [document, func],
      };

      const range = new vscode.Range(
        document.positionAt(func.range[0]),
        document.positionAt(func.range[1])
      );
      items.push(
        new vscode.CodeLens(range, updateDocstringCommand),
        new vscode.CodeLens(range, ignoreCommand)
      );
    });

    return items;
  }
}
