/* eslint-disable eqeqeq */
import * as vscode from "vscode";

import { AuthenticationService } from "./services/authenticate";
import { BillingService } from "./services/billing";
import { DocsService } from "./services/docs";
import { ProgressService } from "./services/progress";
import { TelemetryService } from "./services/telemetry";
import { URIService } from "./services/uri";
import { handleVersionChange } from "./helpers/util";
import { DevService } from "./services/dev";
import { openWebView } from "./helpers/webview";
import { CodeParserService } from "./services/codeParser";

// Mixpanel Public Token
var publicMPToken = "6a946c760957a81165973cc1ad5812ec";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // Setup our Telemetry Service
  var telemetryService = new TelemetryService(publicMPToken);

  // Handle version changes
  handleVersionChange(context, telemetryService);

  // Setup our URI Handler
  var uriService = new URIService(context, telemetryService);

  // Setup our Auth service
  var authService = new AuthenticationService(context, telemetryService);

  // Setup our CodeParser service
  const pending = new CodeParserService(context);
  var codeParserService = await pending;

  //Setup progress Service
  var progressService = new ProgressService(context, codeParserService);

  //Setup our Docs Service
  var docsService = new DocsService(
    context,
    codeParserService,
    progressService,
    telemetryService
  );

  // Setup our Billing Service
  var billingService = new BillingService(context, telemetryService);

  // Setup our Dev Service (for testing only, will confuse users)
  // var devService = new DevService(context);

  var helpCmd = vscode.commands.registerCommand("trelent.help", () => {
    openWebView(context);
  });

  // Dispose of our command registration
  context.subscriptions.push(helpCmd);
  (global as any).testExtensionContext = context;

}

// this method is called when your extension is deactivated
export function deactivate() {}
