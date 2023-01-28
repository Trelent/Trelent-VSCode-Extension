import * as vscode from "vscode";
import { getCheckoutUrl, getPortalUrl } from "../api/api";
import { TokenManager } from "../helpers/token";
import { TelemetryService } from "./telemetry";

export class BillingService {
  constructor(context: vscode.ExtensionContext, telemetry: TelemetryService) {
    // Register our billing-related commands
    let portalCmd = vscode.commands.registerCommand("trelent.portal", () => {
      try {
        this.portal(context, telemetry);
      } catch (err) {
        console.log(err);
      }
    });

    let upgradeCmd = vscode.commands.registerCommand("trelent.upgrade", () => {
      try {
        this.upgrade(context, telemetry);
      } catch (err) {
        console.log(err);
      }
    });

    let upgradeInfoCmd = vscode.commands.registerCommand(
      "trelent.upgrade_info",
      () => {
        try {
          vscode.env.openExternal(
            vscode.Uri.parse("https://trelent.net/#pricing")
          );
        } catch (err) {
          console.log(err);
        }
      }
    );

    context.subscriptions.push(portalCmd, upgradeCmd, upgradeInfoCmd);
  }

  public async upgrade(
    context: vscode.ExtensionContext,
    telemetry: TelemetryService
  ): Promise<any> {
    let token = await TokenManager.getToken(context);
    if (!token) {
      vscode.window.showErrorMessage(
        "You must be logged in to upgrade your plan."
      );
      return;
    }

    vscode.window
      .withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Loading checkout...",
        },
        async () => {
          return await getCheckoutUrl(token);
        }
      )
      .then((checkoutURL) => {
        if (checkoutURL.success && checkoutURL.success === true) {
          vscode.env.openExternal(vscode.Uri.parse(checkoutURL.session));
        } else {
          let actions = [
            { title: "Login", command: "trelent.login" },
            { title: "Try Again", command: "trelent.upgrade" },
          ];

          vscode.window
            .showErrorMessage(
              "Failed to upgrade your account. Try logging in again and retrying.",
              ...actions
            )
            .then(async (action) => {
              if (action) {
                vscode.commands.executeCommand(action!.command);
              }
            });
        }
      });
  }

  public async portal(
    context: vscode.ExtensionContext,
    telemetry: TelemetryService
  ): Promise<any> {
    let token = await TokenManager.getToken(context);
    if (!token) {
      vscode.window.showErrorMessage(
        "You must be logged in to access the billing portal."
      );
      return;
    }

    vscode.window
      .withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Loading billing portal...",
        },
        async () => {
          return await getPortalUrl(token);
        }
      )
      .then((portalURL) => {
        if ((portalURL.success = true)) {
          vscode.env.openExternal(vscode.Uri.parse(portalURL.session));
        } else {
          let actions = [
            { title: "Login", command: "trelent.login" },
            { title: "Try Again", command: "trelent.portal" },
          ];

          vscode.window
            .showErrorMessage(
              "Failed to access the billing portal. Try logging in again and retrying.",
              ...actions
            )
            .then(async (action) => {
              if (action) {
                vscode.commands.executeCommand(action!.command);
              }
            });
        }
      });
  }
}
