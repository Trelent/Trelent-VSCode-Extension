import * as assert from 'assert';
import * as path from "path";
import * as fs from 'fs';
import 'mocha';
import { ExtensionContext, extensions } from 'vscode';
import { CodeParserService } from '../../../services/codeParser';
import { Function } from '../../../parser/types';

suite('C# parser tests', () => {
    let extensionContext: ExtensionContext;
    let codeParserService: CodeParserService;
    let codeFile: string;
    let functions: Function[];
    suiteSetup(async () => {
        // Trigger extension activation and grab the context as some tests depend on it
        await extensions.getExtension('Trelent.trelent')?.activate();
        extensionContext = (global as any).testExtensionContext;
        codeParserService = await new CodeParserService(extensionContext);

        let filePath: string = extensionContext.asAbsolutePath(
            path.join("build", "src", "test", "suite", "parser", "parser-test-files", "test" + ".cs")
          );
        codeFile = fs.readFileSync(filePath,'utf8');
        await codeParserService.parseText(codeFile, 'csharp');
        functions = codeParserService.getFunctions();
    });

    test('Parsing documented functions correctly', async () => {
        assert.strictEqual(functions.length, 6);
    });

    test('Reporting correct amount of documented & undocumented functions', async () => {
        for(let i = 0; i<3; i++){
            assert.notStrictEqual(functions[i].docstring, undefined);
        }

        for(let i = 3; i<6; i++){
            assert.strictEqual(functions[i].docstring, undefined);
        }

    });
});