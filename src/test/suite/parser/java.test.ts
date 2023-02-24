import * as assert from 'assert';
import * as path from "path";
import * as fs from 'fs';
import 'mocha';
import { ExtensionContext, extensions } from 'vscode';
import { CodeParserService } from '../../../services/codeParser';

suite('Java parser tests', () => {
    let extensionContext: ExtensionContext;
    let codeParserService: CodeParserService;
    let codeFile: string;
    suiteSetup(async () => {
        // Trigger extension activation and grab the context as some tests depend on it
        await extensions.getExtension('Trelent.trelent')?.activate();
        extensionContext = (global as any).testExtensionContext;
        codeParserService = new CodeParserService(extensionContext);

        let filePath: string = extensionContext.asAbsolutePath(
            path.join("build", "src", "test", "suite", "parser", "parser-test-files", "test" + ".java")
          );
        codeFile = fs.readFileSync(filePath,'utf8');
    });

    test('Java Parsing documented functions correctly', async () => {
        codeParserService.parseText(codeFile, 'python').then(async () => {
            let functions = codeParserService.getFunctions();
            assert.strictEqual(functions.length, 4);
            });

    });

    test('Java reporting correct amount of documented & undocumented functions', async () => {
        codeParserService.parseText(codeFile, 'python').then(async () => {
            let functions = codeParserService.getFunctions();
            assert.notStrictEqual(functions[0].docstring, undefined);
            assert.notStrictEqual(functions[1].docstring, undefined);
            assert.strictEqual(functions[2].docstring, undefined);
            assert.strictEqual(functions[3].docstring, undefined);
    });

    });
});
