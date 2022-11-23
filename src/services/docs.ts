/* eslint-disable eqeqeq */
import * as vscode from "vscode";

import { requestDocstrings, parseCurrentFunction } from "../api/api";
import { SUPPORTED_LANGUAGES } from "../api/conf";
import { ModuleGatherer } from "../helpers/modules";
import { TelemetryService } from "../services/telemetry";
import { insertDocstrings } from "../helpers/util";
import { ProgressService } from "./progress";

export class DocsService {
  counter: number;
  constructor() {
    this.counter = 0;
  }

  /*
    public init(context: vscode.ExtensionContext, progress: ProgressService, telemetry: TelemetryService) {
        var writeDocstringCmd = vscode.commands.registerCommand('trelent.writeDocstring', () => {
            writeDocstring(context, telemetry);
            this.counter++;
            progress.updateProgress((this.counter/5)*100);
        });

        // Dispose of our command registration
        context.subscriptions.push(writeDocstringCmd);
    }
    */

  public init(context: vscode.ExtensionContext, telemetry: TelemetryService) {
    var writeDocstringCmd = vscode.commands.registerCommand(
      "trelent.writeDocstring",
      () => {
        writeDocstring(context, telemetry);
      }
    );

    // Dispose of our command registration
    context.subscriptions.push(writeDocstringCmd);
  }
}

let writeDocstring = (
  context: vscode.ExtensionContext,
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
        try {
          // Get the editor instance
          let editor = vscode.window.activeTextEditor;
          if (editor == undefined) {
            vscode.window.showErrorMessage("You don't have an editor open.");
            return resolve("Failure");
          }

          if (!SUPPORTED_LANGUAGES.includes(editor.document.languageId)) {
            vscode.window.showErrorMessage("We don't support that language.");
            return resolve("Failure");
          }

          // Get the current document language
          let languageId = editor.document.languageId;

          // Retrieve the function to be documented
          let cursorPosition = editor.selection.active;
          let documentContent = editor.document.getText();

          // Call our API to parse out the currently selected function
          parseCurrentFunction(documentContent, languageId, [
            cursorPosition.line,
            cursorPosition.character,
          ])
            .then(async (response) => {
              let result = response.data;

              if (result == null || result.success == false) {
                vscode.window.showErrorMessage(
                  "We couldn't find a function at your cursor. Try highlighting your function instead, or move your cursor a bit."
                );
                return resolve("Failure");
              } else if (result.current_function == null) {
                vscode.window.showErrorMessage(
                  "We couldn't find a function at your cursor. Try highlighting your function instead, or move your cursor a bit."
                );
                return resolve("Failure");
              }

              let currentFunction = result.current_function;
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
                    } else if (
                      errorType == "exceeded_allowed_function_length"
                    ) {
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

                  let composedDocstring = {
                    docstring: result[0].data.docstring,
                    point: currentFunction.docstring_point,
                  };

                  let docsCount = context.globalState.get<number>(
                    "docs_count",
                    0
                  );
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
            })
            .catch((error) => {
              // Parsing failed server-side
              console.error(error);
              vscode.window.showErrorMessage(
                "Failed to parse your selection! Does this code contain a function or method?"
              );
              return resolve("Failure");
            });
        } catch (error: any) {
          // Something went wrong client-side
          telemetry.trackEvent("Client Error", {
            error: error,
            time: new Date().toISOString(),
          });

          return resolve("Failure");
        }
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
