import * as assert from 'assert';
import * as path from "path";
import * as fs from 'fs';
import 'mocha';
import { ExtensionContext, extensions } from 'vscode';
import { CodeParserService } from '../../../services/codeParser';

suite('JavaScript parser tests', () => {
    let extensionContext: ExtensionContext;
    let codeParserService: CodeParserService;
    let codeFile: string;
    suiteSetup(async () => {
        // Trigger extension activation and grab the context as some tests depend on it
        await extensions.getExtension('Trelent.trelent')?.activate();
        extensionContext = (global as any).testExtensionContext;
        codeParserService = new CodeParserService(extensionContext);

        let filePath: string = extensionContext.asAbsolutePath(
            path.join("build", "src", "test", "suite", "parser", "parser-test-files", "test" + ".js")
          );
        codeFile = fs.readFileSync(filePath,'utf8');
    });

    test('JavaScript Parsing documented functions correctly', async () => {
        codeParserService.parseText(codeFile, 'python').then(async () => {
            let functions = codeParserService.getFunctions();
            assert.strictEqual(functions.length, 12);
            });

    });

    test('JavaScript reporting correct amount of documented & undocumented functions', async () => {
        codeParserService.parseText(codeFile, 'python').then(async () => {
            let functions = codeParserService.getFunctions();
            for(let i = 0; i<6; i++){
                assert.notStrictEqual(functions[i].docstring, undefined);
            }

            for(let i = 6; i<12; i++){
                assert.strictEqual(functions[i].docstring, undefined);
            }
    });

    });
});
