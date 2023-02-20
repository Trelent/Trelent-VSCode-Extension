import * as vscode from "vscode";
import { TelemetryService } from "../services/telemetry";
import { openWebView } from "./webview";

function isMinorUpdate(previousVersion: string, currentVersion: string) {
  // Check for malformed string
  if (previousVersion.indexOf(".") === -1) {
    return true;
  }

  // returns array like [1, 1, 1] corresponding to [major, minor, patch]
  var previousVerArr = previousVersion.split(".").map(Number);
  var currentVerArr = currentVersion.split(".").map(Number);

  // Check major and minor versions
  if (
    currentVerArr[0] > previousVerArr[0] ||
    currentVerArr[1] > previousVerArr[1] ||
    currentVerArr[2] > previousVerArr[2]
  ) {
    return true;
  } else {
    return false;
  }
}

async function showWelcomePage(context: vscode.ExtensionContext) {
  //openWebView("https://trelent-extension-welcome-site.pages.dev/", undefined);
  openWebView(context);
}

async function showVersionPopup(
  context: vscode.ExtensionContext,
  currentVersion: string
) {
  const result = await vscode.window.showInformationMessage(
    `Trelent v${currentVersion} — Check out progress tracking on the bottom of the editor!`,
    ...[
      {
        title: "Join Community",
      },
      {
        title: "Learn More",
      },
    ]
  );

  if (result?.title === "Join Community") {
    vscode.commands.executeCommand(
      "vscode.open",
      vscode.Uri.parse("https://discord.com/invite/trelent")
    );
  } else if (result?.title === "Learn More") {
    vscode.commands.executeCommand("trelent.help");
  }
}

export async function handleVersionChange(
  context: vscode.ExtensionContext,
  telemetry: TelemetryService
) {
  const previousVersion = context.globalState.get<string>("Trelent.trelent");
  const currentVersion =
    vscode.extensions.getExtension("Trelent.trelent")!.packageJSON.version;

  // store latest version
  context.globalState.update("Trelent.trelent", currentVersion);

  if (previousVersion === undefined) {
    // First time install
    showWelcomePage(context);

    // Fire an event
    telemetry.trackEvent("Install", {
      version: currentVersion,
      sender: "vs-code",
    });
  } else if (isMinorUpdate(previousVersion, currentVersion)) {
    showVersionPopup(context, currentVersion);
  }
}

export async function showPopupContent(message: string) {
  await vscode.window.showInformationMessage(message);
}

export function compareDocstringPoints(
  docStrA: { point: number[] },
  docStrB: { point: number[] }
) {
  if (docStrA.point[0] < docStrB.point[0]) {
    return -1;
  }
  if (docStrA.point[0] > docStrB.point[0]) {
    return 1;
  }
  return 0;
}

export function insertDocstrings(
  docstrings: any[],
  editor: vscode.TextEditor,
  languageId: string
) {
  // Track inserted lines in case we want to do multiple
  // docstrings at once for paid users.
  let insertedLines = 0;

  // First, sort our docstrings by first insertion so that when we account
  // for newly-inserted lines, we aren't mismatching docstring locations
  docstrings.sort(compareDocstringPoints);

  docstrings.forEach((docstring: any) => {
    let docPoint = docstring["point"];
    let docStr = docstring["docstring"];

    // Add an extra line if we are at the top of the file.
    if (docPoint[0] < 0) {
      const newLinePos = new vscode.Position(0, 0);
      const newLine = new vscode.SnippetString(`\n`);

      editor?.insertSnippet(newLine, newLinePos);
      docPoint[0] = 0;
    }

    // If this is a c-style language, add a newline above the docstring. Otherwise, add one below.
    // This prevents overwriting the line before or after the docstring. Also check if we need an extra
    // line if there is non-whitespace above the insert location.
    let snippet;
    if (languageId === "python") {
      snippet = new vscode.SnippetString(`${docStr}\n`);
    } else {
      snippet = new vscode.SnippetString(`\n${docStr}\n`);
    }

    const insertPosition = new vscode.Position(
      docPoint[0] + insertedLines,
      docPoint[1]
    );
    editor?.insertSnippet(snippet, insertPosition);

    // DEBUG
    // console.log(docPoint[0]+insertedLines + " " + docPoint[1]);

    const docStrLength = (docStr.match(/\n/g) || []).length + 1;
    insertedLines += docStrLength;
  });
}
