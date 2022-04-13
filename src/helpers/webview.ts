import * as vscode from 'vscode';
const axios = require('axios').default;

export const openWebView = (context: vscode.ExtensionContext, url: string) => {
    // Create and show panel
    const panel = vscode.window.createWebviewPanel(
        'trelentPage',
        'Trelent',
        vscode.ViewColumn.One,
        {
            enableScripts: true
        }
    );

    // And set its HTML content
    axios.get(url)
    .then((response: any) => {
        panel.webview.html = response.data;   
    })
    .catch((error: any) => {
        console.error(error);   
    });
};