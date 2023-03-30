/* eslint-disable eqeqeq */
import * as vscode from "vscode";

import { requestDocstrings } from "../api/api";
import { isLanguageSupported } from "../helpers/langs";
import { ModuleGatherer } from "../helpers/modules";
import { TelemetryService } from "./telemetry";
import { ProgressService } from "./progress";
import { CodeParserService } from "./codeParser";
import { Function } from "../parser/types";

export class DocsService {
  counter: number;
  constructor(
    context: vscode.ExtensionContext,
    parser: CodeParserService,
    progress: ProgressService,
    telemetry: TelemetryService
  ) {
    this.counter = 0;
    var writeDocstringCmd = vscode.commands.registerCommand(
      "trelent.writeDocstring",
      () => {
        writeDocstring(context, parser, telemetry);
        if (progress) {
          this.counter++;
          progress.refresh();
        }
      }
    );

    // Dispose of our command registration
    context.subscriptions.push(writeDocstringCmd);
  }
}

let writeDocstring = async (
  context: vscode.ExtensionContext,
  parser: CodeParserService,
  telemetry: TelemetryService
) => {
  // Check if telemetry is too strict
  if (!telemetry.canSendServerData()) {
    vscode.window.showErrorMessage(
      "Due to your telemetry settings, we cannot " + "fulfill your request."
    );
    return;
  }

  // Get the editor instance
  let editor = vscode.window.activeTextEditor;
  if (editor == undefined) {
    vscode.window.showErrorMessage("You don't have an editor open.");
    return;
  }

  if (!isLanguageSupported(editor.document.languageId)) {
    vscode.window.showErrorMessage("We don't support that language.");
    return;
  }

  // Get the cursor position
  let cursorPosition = editor.selection.active;

  await parser.parse(editor.document);
  // Get currently selected function
  let functions = parser.changeDetectionService.getHistory(
    editor.document
  ).allFunctions;

  // Check if our cursor is within any of those functions
  let currentFunction = isCursorWithinFunction(
    editor.document.offsetAt(cursorPosition),
    functions
  );
  if (currentFunction == undefined) {
    vscode.window.showErrorMessage(
      "We couldn't find a function at your cursor. Try highlighting your function instead, or move your cursor a bit."
    );
    return;
  }

  vscode.commands.executeCommand(
    "trelent.autodoc.update",
    editor.document,
    currentFunction
  );
};

const isCursorWithinFunction = (
  cursorPosition: number,
  functions: Function[]
): Function | undefined => {
  let validFuncs: Function[] = [];
  for (let func of functions) {
    if (cursorPosition >= func.range[0] && cursorPosition <= func.range[1]) {
      validFuncs.push(func);
    }
  }

  // Search for the one with the greatest indentation, ie func.range[0] is the greatest
  let greatestOffset = -1;
  let greatestOffsetFunc: Function | undefined = undefined;
  for (let func of validFuncs) {
    if (func.range[0] > greatestOffset) {
      greatestOffset = func.range[0];
      greatestOffsetFunc = func;
    }
  }

  return greatestOffsetFunc;
};

export let writeDocstringsFromParsedDocument = async (
  context: vscode.ExtensionContext,
  doc: vscode.TextDocument,
  functions: Function[],
  telemetry: TelemetryService
) => {
  if (!telemetry.canSendServerData()) {
    console.log("Not sending docstrings to server because user has opted out");
    return [];
  }
  const editor = vscode.window.visibleTextEditors.find(
    (editor) => editor.document === doc
  );
  if (!editor) {
    console.error("Could not find editor");
    return [];
  }

  if (!isLanguageSupported(editor.document.languageId)) {
    console.log(`Language ${editor.document.languageId} is not supported`);
    return [];
  }

  let languageId = editor.document.languageId;
  if (languageId == "typescript") {
    languageId = "javascript";
  }

  let documentContent = editor.document.getText();

  let format =
    vscode.workspace
      .getConfiguration("trelent")
      .get(`docs.format.${languageId}`) || "rest";

  let modulesText = await ModuleGatherer.getModules(
    documentContent,
    languageId
  );

  if (typeof format != "string") {
    console.error("Invalid format");
    return [];
  }

  let responses: { docstring: string; function: Function }[] = [];

  await requestDocstrings(
    context,
    format,
    functions,
    vscode.env.machineId,
    languageId,
    modulesText
  ).then(
    (
      result: {
        success: boolean;
        error: string;
        data: any;
        function: Function;
      }[]
    ) => {
      if (result == null) {
        console.error("No results from documentation call");
        return;
      }
      result.forEach((docstringData) => {
        responses.push({
          docstring: docstringData.data.docstring,
          function: docstringData.function,
        });
      });
    }
  );

  return responses;
};
