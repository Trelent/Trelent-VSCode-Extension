import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import "mocha";
import { ExtensionContext } from "vscode";
import {
  CodeParserService,
  getCodeParserService,
} from "../../../services/codeParser";
import { Function } from "../../../parser/types";

//TODO: Make test more robust, and less static (Right now it assumes the test files will be in order of
//Documented functions, then undocumented functions, but should work regardless of the order)

const LANG = "java";
const EXPECTED_FUNCTIONS = 4;
const EXPECTED_DOCUMENTED = 2;
const EXPECTED_UNDOCUMENTED = 2;
const EXTENSION = ".java";

suite("Java parser tests", () => {
  let extensionContext: ExtensionContext;
  let codeParserService: CodeParserService;
  let codeFile: string;
  let functions: Function[];
  suiteSetup(async () => {
    // Trigger extension activation and grab the context as some tests depend on it
    extensionContext = (global as any).testExtensionContext;
    codeParserService = getCodeParserService();

    let filePath: string = extensionContext.asAbsolutePath(
      path.join(
        "build",
        "src",
        "test",
        "suite",
        "parser",
        "parser-test-files",
        "test" + EXTENSION
      )
    );
    codeFile = fs.readFileSync(filePath, "utf8");
    await codeParserService.parseText(codeFile, LANG);
    functions = codeParserService.getFunctions();
  });

  test("Parsing documented functions correctly", async () => {
    assert.strictEqual(functions.length, EXPECTED_FUNCTIONS);
  });

  test("Reporting correct amount of documented & undocumented functions", async () => {
    for (let i = 0; i < EXPECTED_DOCUMENTED; i++) {
      assert.notStrictEqual(functions[i].docstring, undefined);
    }

    for (
      let i = EXPECTED_DOCUMENTED;
      i < EXPECTED_UNDOCUMENTED + EXPECTED_UNDOCUMENTED;
      i++
    ) {
      assert.strictEqual(functions[i].docstring, undefined);
    }
  });
});
