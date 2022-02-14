/* eslint-disable eqeqeq */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { requestDocstrings, parseCurrentFunction } from './api/api';
import { SUPPORTED_LANGUAGES } from './api/conf';
import { insertDocstrings, showSignupPopup } from './util';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Invite the user to sign up every time our extension has a minor or major update
	showSignupPopup(context);

	// Generate a docstring for the selected code
	let writeDocstring = vscode.commands.registerCommand('trelent.writeDocstring', () => {

		// Initialize a progress bar
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Writing docstring...',
		  }, async () => {

			const writeDocstring = new Promise(async (resolve, reject) => {
				try {
					// Get the editor instance
					let editor = vscode.window.activeTextEditor;
					if(editor == undefined) {
						vscode.window.showErrorMessage("You don't have an editor open.");
						return resolve('Failure');
					}

					if(!SUPPORTED_LANGUAGES.includes(editor.document.languageId))
					{
						vscode.window.showErrorMessage("We don't support that language.");
						return resolve('Failure');
					}

					// Get the current document language
					let languageId = editor.document.languageId;

					// Retrieve the function to be documented
					let cursorPosition = editor.selection.active;
					let documentContent = editor.document.getText();

					// Call our API to parse out the currently selected function
					parseCurrentFunction(documentContent, editor.document.languageId, [cursorPosition.line, cursorPosition.character])
					.then((response) => {
						let result = response.data;

						if(result == null || result.sucess == false) {
							vscode.window.showErrorMessage("Cursor was not within scope of any functions in this file.")
							return resolve('Failure');
						}

						if(result.current_function == null) {
							vscode.window.showErrorMessage("We couldn't find your cursor in that function. Try highlighting your function instead, or move your cursor a bit.")
							return resolve('Failure');
						}
						
						let current_function = result.current_function;
						requestDocstrings([current_function], vscode.env.machineId, languageId)
						.then((result) => {
							if(result == null)
							{
								vscode.window.showErrorMessage("Doc writing failed. Please try again later.");
								return resolve('Failure');
							}

							if(result.length == 0)
							{
								vscode.window.showErrorMessage("Something went wrong on our end. Sorry about that! Please try again in a few seconds.");
								return resolve('Failure');
							}

							if(editor == undefined) {
								vscode.window.showErrorMessage("Looks like you closed your editor! Please try again, and keep the editor open until the docstrings are written.");
								return resolve('Failure');
							}

							insertDocstrings(result, editor, languageId);

							return resolve('Success');
						})
						.catch((error) => {
							// Doc writing failed server-side with a 500 error. Very weird...
							console.error(error);
							vscode.window.showErrorMessage("Doc writing failed. Please try again later.");
							return resolve('Failure');
						});
					})
					.catch((error) => {
						// Parsing failed server-side
						console.error(error);
						vscode.window.showErrorMessage("Failed to parse your selection! Is this valid Python code?");
						return resolve('Failure');
					});

				} catch {
					// Something else went wrong
					return resolve('Failure');
				}
			});			

			const timeout = new Promise((resolve, reject) => {
				setTimeout(() => {resolve('Timeout');}, 30000);
			});

			const winner = await Promise.race([writeDocstring, timeout]);
			if (winner === 'Timeout') {
				vscode.window.showErrorMessage('Trelent timed out. Please try again in a few seconds.');
			}
		});
	});

	// Dispose of our command registrations
	context.subscriptions.push(writeDocstring);
}

// this method is called when your extension is deactivated
export function deactivate() {}