/* eslint-disable eqeqeq */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const axios = require('axios').default;


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log("MachineId: " + vscode.env.machineId);

	// Display a users API Key
	/*
	let getKey = vscode.commands.registerCommand('trelent.getKey', () => {
		getAPIKey(context)
		.then(value => {
			vscode.window.showInformationMessage("Current Trelent API Key: " + value);
		});
	});
	*/
	
	// Update a users API Key
	/*
	let signIn = vscode.commands.registerCommand('trelent.signIn', () => {
		
		// Okay, proceed with sign in. Prompt the user for their API Key
		vscode.window.showInputBox({
			placeHolder: "sk_trlnt_...",
			prompt: "You can find your API key at docgen.trelent.net/#/keys",
			title: "Set your Trelent API Key"
		})
		.then(value => {

			// Check if the user typed anything in the input box
			if(value != null) {

				// Update the global state with the new key
				context.secrets.store("trelent_api_key", value)
				.then(() => {
					vscode.window.showInformationMessage("API Key was updated successfully!");
				});
			}
			else {
				vscode.window.showInformationMessage("Sign-in was cancelled!");
			}
		});
	});
	 */
	

	// Generate a docstring for the selected code
	let generateDocstring = vscode.commands.registerCommand('trelent.generateDocstring', () => {

		vscode.window.showInformationMessage("Generating docstrings...");

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

				if(languageId == "python") {
					// Generate our docstrings
					generateSnippetDocstring(context, snippet, languageId)
					.then((response: { docstring: string; } | null) => {
						if(response != null) {

							// Quickly setup our docstring editor
							const docstring = response.docstring;
							
							console.log(docstring);
						}
						else {
							// Something went wrong on our end!
							vscode.window.showErrorMessage("Doc writing failed!");
						}
					});
				}
				else {

					// Unsupported language
					vscode.window.showErrorMessage("We currently only support Python!");
				}
			}
			else {
				// No snippet selected!
				// TODO: Get current function/scope instead
				vscode.window.showErrorMessage("You need to select a snippet of code first!");
			}
		}
		else {
			// No editor open!
			vscode.window.showErrorMessage("No editor was opened to generate a docstring from!");
		}
	});

	// Dispose of our command registrations
	context.subscriptions.push(generateDocstring);
}

function generateSnippetDocstring(context: vscode.ExtensionContext, snippet: String, lang: String) {
	// Hey Han & Hahnbee! Hope Mintlify is doing well. Nothing juicy to see here unbfortunately :)

	// Setup our data
	let reqBody = {
		'language': lang,
		'sender': 'ext-vscode',
		'snippet': snippet,
		'user': vscode.env.machineId,
	};

	return axios({
		method: 'post',
		url: "https://trelent.npkn.net/generate-python-docstring",
		data: JSON.stringify(reqBody),
		headers: {
			//'X-Trelent-API-Key': key,
			'Content-Type': 'application/json',
		}
	})
	.then((response: any) => {
		// Success!
		return response.data;
	})
	.catch((error: Error) => {
		// Likely an authentication issue
		console.error(error);
		return null;
	});
}

// this method is called when your extension is deactivated
export function deactivate() {}