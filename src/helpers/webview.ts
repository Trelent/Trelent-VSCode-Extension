import * as vscode from "vscode";
const fs = require("fs");
const axios = require("axios").default;

export const openWebView = (url?: string, path?: string) => {
  // Create and show panel
  const panel = vscode.window.createWebviewPanel(
    "trelentPage",
    "Trelent",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
    }
  );

  if (url) {
    //panel.webview.html = getWebviewContent(url, panel);

    // And set its HTML content
    axios
      .get(url)
      .then((response: any) => {
        panel.webview.html = response.data;
      })
      .catch((error: any) => {
        console.error(error);
      });
  }
};

// TODO: Fix this so we can load styles in from our public site
const getWebviewContent = (url: string, panel: vscode.WebviewPanel) => {
  // load webview content as url
  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${panel.webview.cspSource} https:; script-src 'unsafe-inline' 'unsafe-eval' ${panel.webview.cspSource}; style-src 'unsafe-inline' ${panel.webview.cspSource};">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Trelent</title>
        </head>
        <body>
            <iframe src="${url}" style="width: 100%; height: 100%; border: none;"></iframe>
        </body>
        </html>
    `;
};
