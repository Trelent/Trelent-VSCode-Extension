import * as vscode from "vscode";
import "mocha";
import { ExtensionContext } from "vscode";
import * as path from "path";
import * as assert from "assert";
import {
  CodeParserService,
  getCodeParserService,
} from "../../../services/codeParser";

suite("Range offset tests", () => {
  let extensionContext: ExtensionContext;
  let codeParser: CodeParserService;
  let documents: vscode.TextDocument[] = [];
  let fileUris: vscode.Uri[] = [];

  const FILE_EXTENSIONS = [".cs", ".java", ".js", ".py", ".ts"];
  const EXPECTED_FUNCTIONS = [6, 4, 14, 4, 12];
  suiteSetup(async () => {
    // Trigger extension activation and grab the context as some tests depend on it
    extensionContext = (global as any).testExtensionContext;
    codeParser = getCodeParserService();
    for (let extension of FILE_EXTENSIONS) {
      let filePath: string = extensionContext.asAbsolutePath(
        path.join(
          "build",
          "src",
          "test",
          "suite",
          "parser",
          "parser-test-files",
          "test" + extension
        )
      );
      fileUris.push(vscode.Uri.file(filePath));
    }
    for (let uri of fileUris) {
      let document = await vscode.workspace.openTextDocument(uri);
      documents.push(document);
    }

    for (let document of documents) {
      await codeParser.parse(document);
    }
  });

  test("Offsetting range does not cause changes", async () => {
    console.log("Hello from test offset range!");
    for (let i = 0; i < documents.length; i++) {
      let document = documents[i];
      let editor = await vscode.window.showTextDocument(document);
      await editor?.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), " ");
      });

      const docFunctionData =
        codeParser.changeDetectionService.getDocumentFunctionData(document);
      const allDocumentFunctions = docFunctionData.allFunctions;

      assert.strictEqual(
        allDocumentFunctions.length,
        EXPECTED_FUNCTIONS[i],
        "Functions being parsed after offsetting range"
      );

      const changedFunctions = docFunctionData.updates;
      const changesArray = Object.values(changedFunctions).flatMap(
        (val) => val
      );

      assert.strictEqual(changesArray.length, 0, "No changes being reported");
    }
  });
});
