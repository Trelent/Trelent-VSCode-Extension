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

// Mixpanel Public Token
var publicMPToken = "6a946c760957a81165973cc1ad5812ec";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Setup our Telemetry Service
  var telemetryService = new TelemetryService(publicMPToken);

  // Handle version changes
  handleVersionChange(context);

  // Setup our URI Handler
  var uriService = new URIService();
  uriService.init(context, telemetryService);

  // Setup our Auth service
  var authService = new AuthenticationService();
  authService.init(context, telemetryService);

  /* Not ready for this release */
  // Setup documentation Progress Service
  // var progressService = new ProgressService(context);
  // Setup our Docs Service
  // var docsService = new DocsService();
  // docsService.init(context, progressService, telemetryService);

  // Setup our Docs Service
  var docsService = new DocsService();
  docsService.init(context, telemetryService);

  // Setup our Billing Service
  var billingService = new BillingService();
  billingService.init(context, telemetryService);

  // Setup our Dev Service (for testing only, will confuse users)
  var devService = new DevService(context);
}

// this method is called when your extension is deactivated
export function deactivate() {}
