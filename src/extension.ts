/* eslint-disable eqeqeq */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { requestDocstrings, parseSnippet } from './api/api';
import { compareDocstringPoints } from './util';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Generate a docstring for the selected code
	let writeDocstring = vscode.commands.registerCommand('trelent.writeDocstrings', () => {

		// Initialize a progress bar
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Writing docstrings...',
		  }, async () => {

			const writeDocstrings = new Promise(async (resolve, reject) => {
				try {
					// Now get the selected region or closest function to the cursor
					let editor = vscode.window.activeTextEditor;
					if(editor !== undefined) {

						// Get the current selection if one exists
						let selection = editor.selection;
						if(!selection.isEmpty) {

							// Selection exists, generate docstring for this selection assuming it is a function
							let snippet = editor.document.getText(new vscode.Range(selection.start, selection.end));

							// Let's try parsing the inputted snippet
							let languageId = editor.document.languageId;

							// JavaScript support is here :D
							if(languageId == "python" || languageId == "javascript") {

								// Parse the selection for functions to document
								parseSnippet(snippet, languageId)
								.then((response) => {
									let result = response.data;

									if(result.success == true) {
										requestDocstrings(result.functions, vscode.env.machineId, languageId)
										.then((result) => {
											if(result != null) {

												if(result.length > 0) {
													// Insert all our new docstrings
													let insertedLines = 0;

													// First, sort our docstrings by first insertion so that when we account
													// for newly-inserted lines, we aren't mismatching docstring locations
													result.sort(compareDocstringPoints);

													result.forEach((docstring:any) => {
														let docPoint = docstring["point"];
														let docStr = docstring["docstring"];

														console.log(docPoint[0]);
														if(docPoint[0] < 0) { 
															docPoint[0] = 0;
														}


														// If we are in JS, we have to account for a situation where
														// the line on which the docstring is being inserted is not empty
														// and thus we need to add an extra row to our insert position.
														if(languageId == "javascript") {

															const insertLine = editor?.document.lineAt(docPoint[0]).text;
															let isEmpty = false;
															
															if(insertLine != undefined) {
																isEmpty = !/\S/.test(insertLine);
															}
															
															if(!isEmpty) { 
																docPoint[0]++;
															}
														}

														const snippet = new vscode.SnippetString(`${docStr}\n`);
														const insertPosition = new vscode.Position(docPoint[0] + selection.start.line + insertedLines, docPoint[1]);
														editor?.insertSnippet(snippet, insertPosition);

														const docStrLength = (docStr.match(/\n/g)||[]).length + 1;
														insertedLines += docStrLength;
													});

													return resolve('Success');
												}
												else {
													// Doc writing failed server-side in a graceful way
													vscode.window.showErrorMessage("We could not find any functions in the selected snippet.");
													return resolve('Failure');
												}
											}
											else {
												// Doc writing failed server-side in a graceful way
												vscode.window.showErrorMessage("Doc writing failed. Please try again later.");
												return resolve('Failure');
											}
										})
										.catch((error) => {
											// Doc writing failed server-side with a 500 error. Very weird!
											console.error(error);
											vscode.window.showErrorMessage("Doc writing failed. Please try again later.");
											return resolve('Failure');
										});
									}
									else {
										// Parsing failed client-side
										vscode.window.showErrorMessage("Failed to parse your selection! Is this valid Python code?");
										return resolve('Failure');
									}
								})
								.catch((error) => {
									// Parsing failed server-side
									console.error(error);
									vscode.window.showErrorMessage("Failed to parse your selection! Is this valid Python code?");
									return resolve('Failure');
								});
							}
							else {
								// Unsupported language
								vscode.window.showErrorMessage("We currently only support Python!");
								return resolve('Failure');
							}
						}
						else {
							// No snippet selected!
							// TODO: Get current function/scope instead
							vscode.window.showErrorMessage("You need to select a snippet of code first!");
							return resolve('Failure');
						}
					}
					else {
						// No editor open!
						vscode.window.showErrorMessage("No editor is open!");
						return resolve('Failure');
					}
				} catch {
					// Something else went wrong
					return resolve('Failure');
				}
			});			

			const timeout = new Promise((resolve, reject) => {
				setTimeout(() => {resolve('Timeout');}, 30000);
			});

			const winner = await Promise.race([writeDocstrings, timeout]);
			if (winner === 'Timeout') {
				vscode.window.showErrorMessage('Trelent timed out... please try again later.');
			}
			else if(winner === 'Failure') { 
				vscode.window.showErrorMessage('Something went wrong.');
			}
		});
	});

	// Dispose of our command registrations
	context.subscriptions.push(writeDocstring);
}

// this method is called when your extension is deactivated
export function deactivate() {}