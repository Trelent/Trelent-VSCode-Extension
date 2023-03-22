/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

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

  public registerCodeLensProvider(highlightedFunctions: Function[]) {
    console.log(
      "DocstringCodelens.registerCodeLensProvider registered for ",
      highlightedFunctions.length,
      " functions"
    );
    this.provider.highlightedFunctions = highlightedFunctions;
  }
}

class AutodocCodelensProvider implements vscode.CodeLensProvider {
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
        arguments: [func],
      };

      const ignoreCommand: vscode.Command = {
        command: "trelent.autodoc.ignore",
        title: vscode.l10n.t("Ignore"),
        arguments: [func],
      };

      const range = document.lineAt(func.range[0][0]).range;
      items.push(
        new vscode.CodeLens(range, updateDocstringCommand),
        new vscode.CodeLens(range, ignoreCommand)
      );
    });

    return items;
  }
}
