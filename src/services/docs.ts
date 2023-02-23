/* eslint-disable eqeqeq */
import * as vscode from "vscode";

import { requestDocstrings, parseCurrentFunction } from "../api/api";
import { isLanguageSupported } from "../helpers/langs";
import { ModuleGatherer } from "../helpers/modules";
import { TelemetryService } from "./telemetry";
import { insertDocstrings } from "../helpers/util";
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

let writeDocstring = (
  context: vscode.ExtensionContext,
  parser: CodeParserService,
  telemetry: TelemetryService
) => {
  // Initialize a progress bar
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Writing docstring...",
    },
    async () => {
      const writeDocstring = new Promise(async (resolve, reject) => {
        // Check if telemetry is too strict
        if (!telemetry.canSendServerData()) {
          vscode.window.showErrorMessage(
            "Due to your telemetry settings, we cannot " +
              "fulfill your request."
          );
          return resolve("Failure");
        }

        // Get the editor instance
        let editor = vscode.window.activeTextEditor;
        if (editor == undefined) {
          vscode.window.showErrorMessage("You don't have an editor open.");
          return resolve("Failure");
        }

        if (!isLanguageSupported(editor.document.languageId)) {
          vscode.window.showErrorMessage("We don't support that language.");
          return resolve("Failure");
        }

        //Parse document
        await parser.parse(editor.document);

        // Get the current document language
        let languageId = editor.document.languageId;

        // Get the cursor position
        let cursorPosition = editor.selection.active;
        let documentContent = editor.document.getText();

        // Get currently selected function
        let functions = parser.getFunctions();

        // Check if our cursor is within any of those functions
        let currentFunction = isCursorWithinFunction(cursorPosition, functions);
        if (currentFunction == undefined) {
          vscode.window.showErrorMessage(
            "We couldn't find a function at your cursor. Try highlighting your function instead, or move your cursor a bit."
          );
          return resolve("Failure");
        }

        let format =
          vscode.workspace
            .getConfiguration("trelent")
            .get(`docs.format.${languageId}`) || "rest";

        let modulesText = await ModuleGatherer.getModules(
          documentContent,
          languageId
        );

        if (typeof format != "string") {
          vscode.window.showErrorMessage(
            "We couldn't find a doc format for that language."
          );
          return resolve("Failure");
        }

        requestDocstrings(
          context,
          format.toLowerCase(),
          [currentFunction],
          vscode.env.machineId,
          languageId,
          modulesText
        )
          .then((result) => {
            if (result == null) {
              vscode.window.showErrorMessage(
                "Whoa there! One docstring at a time, please."
              );
              return resolve("Failure");
            }

            if (result[0].successful === false) {
              let errorMsg = result[0].error;
              let errorType = result[0].error_type;

              // Change the messaging based on the error type
              if (errorType == "exceeded_anonymous_quota") {
                let actions = [
                  { title: "Sign Up", command: "trelent.signup" },
                  { title: "Login", command: "trelent.login" },
                ];

                vscode.window
                  .showErrorMessage(errorMsg, ...actions)
                  .then((selection) => {
                    if (selection != undefined) {
                      vscode.commands.executeCommand(selection.command);
                    }
                  });
              } else if (errorType == "exceeded_free_quota") {
                let actions = [
                  { title: "Upgrade", command: "trelent.upgrade" },
                  {
                    title: "Learn More",
                    command: "trelent.upgrade_info",
                  },
                ];

                vscode.window
                  .showErrorMessage(errorMsg, ...actions)
                  .then((selection) => {
                    if (selection != undefined) {
                      vscode.commands.executeCommand(selection.command);
                    }
                  });
              } else if (errorType == "exceeded_paid_quota") {
                vscode.window.showErrorMessage(errorMsg);
              } else if (errorType == "exceeded_allowed_function_length") {
                vscode.window.showErrorMessage(errorMsg);
              } else {
                vscode.window.showErrorMessage(errorMsg);
              }

              return resolve("Failure");
            }

            if (editor == undefined) {
              vscode.window.showErrorMessage(
                "It looks like you closed your editor! Please try again, and keep the editor open until the docstrings have been written."
              );
              return resolve("Failure");
            }

            if (currentFunction == undefined) {
              vscode.window.showErrorMessage(
                "We couldn't find a function at your cursor. Try highlighting your function instead, or move your cursor a bit."
              );
              return resolve("Failure");
            }

            let composedDocstring = {
              docstring: result[0].data.docstring,
              point: currentFunction.docstring_point,
            };

            let docsCount = context.globalState.get<number>("docs_count", 0);
            context.globalState.update("docs_count", docsCount + 1);

            if (docsCount == 5) {
              vscode.window
                .showInformationMessage(
                  "Looks like you're liking Trelent! Come join our community!",
                  "Join Discord"
                )
                .then((selection) => {
                  if (selection != undefined) {
                    vscode.commands.executeCommand(
                      "vscode.open",
                      vscode.Uri.parse("https://discord.gg/trelent")
                    );
                  }
                });
            }

            insertDocstrings([composedDocstring], editor, languageId);

            return resolve("Success");
          })
          .catch((error) => {
            // Doc writing failed server-side with a 500 error. Very weird...
            console.error(error);
            vscode.window.showErrorMessage(
              "Doc writing failed. Please try again later."
            );
            return resolve("Failure");
          });
      });

      const timeout = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve("Timeout");
        }, 30000);
      });

      const winner = await Promise.race([writeDocstring, timeout]);
      if (winner === "Timeout") {
        vscode.window.showErrorMessage(
          "Trelent is experiencing high load at the moment. Please try again in a few seconds. If you continue to experience this issue, please contact us at contact@trelent.net"
        );
      }
    }
  );
};

const isCursorWithinFunction = (
  cursorPosition: vscode.Position,
  functions: Function[]
): Function | undefined => {
  console.log("Cursor Position:");
  console.log(cursorPosition);
  let validFuncs: Function[] = [];
  for (let func of functions) {
    if (
      cursorPosition.line >= func.range[0][0] 
      && cursorPosition.line <= func.range[1][0] 

    ) {
      validFuncs.push(func);
    }
  }

  // Search for the one with the greatest indentation, ie func.range[0][1] is the greatest
  let greatestIndentation = -1;
  let greatestIndentationFunc: Function | undefined = undefined;
  for (let func of validFuncs) {
    if (func.range[0][1] > greatestIndentation) {
      greatestIndentation = func.range[0][1];
      greatestIndentationFunc = func;
    }
  }

  return greatestIndentationFunc;
};
