/* eslint-disable eqeqeq */
import * as vscode from 'vscode';

import { AuthenticationService } from './services/authenticate';
import { BillingService } from './services/billing';
import { DocsService } from './services/docs';
import { URIService } from './services/uri';
import { showPopup } from './util';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Invite the user to sign up every time our extension has a minor or major update
	showPopup(context);

	// Setup our URI Handler
	var uriService = new URIService();
	uriService.init(context);

	// Setup our Auth service
	var authService = new AuthenticationService();
	authService.init(context);

	// Setup our Docs Service
	var docsService = new DocsService();
	docsService.init(context);

	// Setup our Billing Service
	var billingService = new BillingService();
	billingService.init(context);
}

// this method is called when your extension is deactivated
export function deactivate() {}