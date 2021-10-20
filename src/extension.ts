/* eslint-disable eqeqeq */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const axios = require('axios').default;


// Set up our code parsers for various languages
import * as Parser from 'web-tree-sitter';
import * as path from 'path';

/*
const languages: {[id: string]: {module: string, parser?: Parser}} = {
	'python': {module: 'tree-sitter-python'},
	'java': {module: 'tree-sitter-java'},
	'javascript': {module: 'tree-sitter-javascript'},
};
*/
const languages: {[id: string]: {module: string, parser?: Parser}} = {
	'python': {module: 'tree-sitter-python'},
};

// Picker indeces
const docIndexList = [
	"Docstring 1",
	"Docstring 2",
	"Docstring 3",
	"Docstring 4",
	"Docstring 5"
];


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Started loading DocGen
	console.log('Trelent activating...');



	// Update the language parser for the language associated with the visible text editors
	async function updateLanguageParsers() {
		for(const editor of vscode.window.visibleTextEditors) {
			const language = languages[editor.document.languageId];
			if (language == null) {
				return;
			}

			if (language.parser == null) {
				const absolute = path.join(context.extensionPath, 'parsers', language.module + '.wasm');
				const wasm = path.relative(process.cwd(), absolute);
				const lang = await Parser.Language.load(wasm);
				const parser = new Parser();
				parser.setLanguage(lang);
				language.parser = parser;
			}
		}
	}


	// Setup our language parser for every new language opened in a vscode editor
	let addNewLanguageForNewEditor = vscode.window.onDidChangeVisibleTextEditors(updateLanguageParsers);
	let addNewLanguageForNewDocument = vscode.workspace.onDidOpenTextDocument(updateLanguageParsers);

	// Display a users API Key
	let getKey = vscode.commands.registerCommand('trelent.getKey', () => {
		getAPIKey(context)
		.then(value => {
			vscode.window.showInformationMessage("Current Trelent API Key: " + value);
		});
	});
	
	// Update a users API Key
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

	// Generate a docstring for the selected code
	let generateDocstring = vscode.commands.registerCommand('trelent.generateDocstring', () => {

		vscode.window.showInformationMessage("Generating docstrings...");

		// First, retrieve our API Key
		getAPIKey(context)
		.then(key => {

			// Check if we are signed in
			if(key != null) {

				// Success!
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

						if(languageId == "python" || languageId == "javascript") {
							// Generate our docstrings
							generateSnippetDocstring(context, snippet, languageId)
							.then(response => {
								if(response != null) {

									// Quickly setup our docstring editor
									const docstrings = response.docstrings;
									let resultantString = '\n\n\n\n\n\n\n\n\n\n';
									
									let i = 0;
									for(let docstring of docstrings) {
										if(languageId == "python") {

											// Python comment style
											resultantString += `# ${docIndexList[i]}:\n\n` + docstring + `\n\n`;

										}
										else if(languageId == "javascript") {

											// JS comment style
											resultantString += `// ${docIndexList[i]}:\n\n` + docstring + `\n\n`;
										}
										else {

											// Default to Python - this code should never actually be hit due to previous checks against languageid
											resultantString += `# ${docIndexList[i]}:\n\n` + docstring + `\n\n`;
										}

										i++;
									}

									vscode.workspace.openTextDocument({language: languageId, content: resultantString})
									.then(document => {
										if(document != null) {
											vscode.window.showTextDocument(document, vscode.ViewColumn.Beside)
											.then(secondEditor => {

												// Create our quick pick
												vscode.window.showQuickPick(docIndexList, {
													ignoreFocusOut: true,
													title: "Which Docstring would you like to use?"
												})
												.then(docIndex => {
													if(docIndex != null) {

														//TODO: We should send telemetry to our server later on so we can predict what selection a user is most likely to make

														// User selected this docstring!
														// Insert it into our document
														let docStringPos = new vscode.Position(selection.start.line, 0);
														let docStringRange = new vscode.Range(docStringPos, docStringPos);
														let index = parseInt(docIndex.slice(10)) - 1;
														editor?.insertSnippet(new vscode.SnippetString(docstrings[index] + '\n'), docStringRange);
													}
													else {
														if(editor?.viewColumn != null) {
															vscode.window.showTextDocument(secondEditor.document, editor.viewColumn.valueOf() + 1)
															.then(editor => {
																
															});

															// Not signed in!
															vscode.window.showErrorMessage("Docstring generation cancelled!");
														}
													}
												});
											});
										}
									});
								}
								else {
									// Not signed in, or something went wrong on our end!
									vscode.window.showErrorMessage("Authentication failed. Double check that you copied in your API Key correctly.");
								}
							});
						}
						else {

							// Unsupported language
							vscode.window.showErrorMessage("Generation failed. We do not support the language you tried to generate documentation for.");
						}
					}
					else {
						// No snippet selected!
						vscode.window.showErrorMessage("You need to select a snippet of code first!");
					}
				}
				else {
					// No editor open!
					vscode.window.showErrorMessage("No editor was opened to generate a docstring from!");
				}
			}
			else {
				// Not signed in!
				vscode.window.showErrorMessage("You need to Sign In first!");
			}
		});
	});

	// Dispose of our command registrations
	context.subscriptions.push(addNewLanguageForNewEditor);
	context.subscriptions.push(addNewLanguageForNewDocument);
	context.subscriptions.push(getKey);
	context.subscriptions.push(signIn);
	context.subscriptions.push(generateDocstring);

	console.log('Trelent activated successfully!');
}

function getAPIKey(context: vscode.ExtensionContext) {

	// Retrieve our key using the secrets
	return context.secrets.get("trelent_api_key");
}

function generateSnippetDocstring(context: vscode.ExtensionContext, snippet: String, lang: String) {

	return getAPIKey(context)
	.then(key => {

		// Setup our data
		let reqBody = {
			'language': lang,
			'sender': 'ext-vscode',
			'snippet': snippet,
			'user': key,
		};

		return axios({
			method: 'post',
			url: "https://trelent.npkn.net/generate-docstring",
			data: JSON.stringify(reqBody),
			headers: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				'Api-Key': key,
				// eslint-disable-next-line @typescript-eslint/naming-convention
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
	});
}

// this method is called when your extension is deactivated
export function deactivate() {}