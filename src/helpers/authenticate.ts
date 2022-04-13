import * as vscode from "vscode";
import { LOGIN_URL, LOGOUT_URL } from "../api/conf";
import * as polka from "polka";
import { TokenManager } from "./token";
import { openWebView } from "./webview";

export const authenticate = (context: vscode.ExtensionContext, mode: string) => {
  const app = polka();

  app.get(`/auth/:token`, async (req, res) => {
    const { token } = req.params;
    if (!token) {
      res.end(`<h1>Something went wrong. Please close this window and try again.</h1>`);
      vscode.window.showErrorMessage("Authentication failed! Please try again.");
      return;
    }

    await TokenManager.setToken(context, token);

    res.end(`<h1>Authentication was successful!</h1><h3>You may close this window.</h3>`);
    vscode.window.showInformationMessage(`Login successful!`);
    
    // Save this for when we can do a fancier web-based onboarding within VS Code
    //openWebView(context, "https://trelent.net");

    (app as any).server.close();
  });

  app.listen(54321, (err: Error) => {
    if (err) {
      vscode.window.showErrorMessage(err.message);
    } else {
      vscode.commands.executeCommand(
        "vscode.open",
        vscode.Uri.parse(`${LOGIN_URL}?mode=${mode}`)
      )
      .then(() => {
        
      });
    }
  });
};

export const logout = async (context: vscode.ExtensionContext) => {
  TokenManager.setToken(context, "").then(() => {
    const app = polka();

    app.get(`/loggedout`, async (req, res) => {

      res.end(`<h1>Successfully logged out of Trelent!</h1><h3>You may close this window.</h3>`);

      (app as any).server.close();
    });

    app.listen(54321, (err: Error) => {
      if (err) {
        vscode.window.showErrorMessage(err.message);
      } else {
        vscode.commands.executeCommand(
          "vscode.open",
          vscode.Uri.parse(`${LOGOUT_URL}`)
        )
        .then(() => {
          vscode.window.showInformationMessage("You have been logged out of Trelent.");
        });
      }
    });
  });
};