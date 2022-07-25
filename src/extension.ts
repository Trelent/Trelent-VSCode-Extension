/* eslint-disable eqeqeq */
import * as vscode from 'vscode';

import { AuthenticationService } from './services/authenticate';
import { BillingService } from './services/billing';
import { DocsService } from './services/docs';
import { TelemetryService } from './services/telemetry';
import { URIService } from './services/uri';
import { showVersionPopup } from './util';

// Mixpanel Public Token
var publicMPToken = '6a946c760957a81165973cc1ad5812ec';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Setup our Telemetry Service
	var telemetryService = new TelemetryService(publicMPToken);

	// Invite the user to sign up every time our extension has a minor or major update
	showVersionPopup(context);

	// Setup our URI Handler
	var uriService = new URIService();
	uriService.init(context, telemetryService);

	// Setup our Auth service
	var authService = new AuthenticationService();
	authService.init(context, telemetryService);

	// Setup our Docs Service
	var docsService = new DocsService();
	docsService.init(context, telemetryService);

	// Setup our Billing Service
	var billingService = new BillingService();
	billingService.init(context, telemetryService);
}

// this method is called when your extension is deactivated
export function deactivate() {

}