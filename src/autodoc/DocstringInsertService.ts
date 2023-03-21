import * as vscode from 'vscode'
import { CodeParserService } from '../services/codeParser';
import { DocstringRecommendation, Function }  from '../parser/types'
import { DocsService, writeDocstringsFromParsedDocument } from '../services/docs';
import { TelemetryService } from '../services/telemetry';
import { hashFunction, hashID } from './changeDetection';
import DocstringDecorator from './DocstringDecorator';

export default class DocstringInsertService{
    

    private codeParserService: CodeParserService;
    private telemetryService: TelemetryService;
    private docstringDecorator: DocstringDecorator;
    private provider: vscode.InlineCompletionItemProvider;

    private updating = new Set<vscode.TextDocument>();

    private changedFunctions: {[key: string]: Set<String>} = {};

    public AUTODOC_AUTO_TAG = "@trelent-auto";
    public AUTODOC_IGNORE_TAG = "@trelent-ignore";
    public AUTO_DOC_HIGHLIGHT_TAG = "@trelent-highlight";

    constructor(private context: vscode.ExtensionContext, codeParserService: CodeParserService, telemetryService: TelemetryService) {
        this.codeParserService = codeParserService;
        this.telemetryService = telemetryService;
        this.docstringDecorator = new DocstringDecorator();


        //Provider will insert InlineCompletionItems to display recommended docstrings
        this.provider = {
            //@ts-ignore
            provideInlineCompletionItems: async (document, position, context, token) => {
                const editor = vscode.window.visibleTextEditors.find((editor) => editor.document === document);
                if(!editor){
                    return;
                }
        
                if(this.updating.has(document)){
                    return;
                }
                console.log("here")

                this.updating.add(document);

                await this.codeParserService.parse(document);

                
                let fileHistory = this.codeParserService.changeDetectionService.getHistory(document)
                let allFunctions = fileHistory.allFunctions;
                let changedFunctions: {[key: string]: Function[]} = fileHistory.updates;
                if(changedFunctions.new.length == 0 && changedFunctions.updated.length == 0 && changedFunctions.deleted.length == 0){
                    this.updating.delete(document);
                    return [];
                }

                let docId = hashID(document);
                if(!this.changedFunctions[docId]){
                    this.changedFunctions[docId] = new Set();
                }
                try{
                    //Remove deleted functions from docstring recommendations

                    changedFunctions.deleted.forEach(func => {
                            let funcId = hashFunction(func);
                            this.changedFunctions[docId].delete(funcId)
                    });

                    //Update function updates
                    Object.keys(changedFunctions).filter(title => title != "deleted").flatMap(title => changedFunctions[title]).forEach(func => {
                        let funcId = hashFunction(func);
                        this.changedFunctions[docId].add(funcId)
                    })

                    //Update docstring recommendations
                    let functionsToDocument: Function[] = [...this.changedFunctions[docId]].map(funcId => allFunctions.find(func => hashFunction(func) == funcId)!);

                    const trelentConfig = vscode.workspace.getConfiguration("trelent");

                    const autodocMode = trelentConfig.get("autodoc.mode");




                    
                    this.docstringDecorator.applyDocstringRecommendations(functionsToDocument, document)
                }
                finally{
                    this.updating.delete(document);
                    return {};
                }
                
            }
        }

        vscode.languages.registerInlineCompletionItemProvider({pattern: "**"}, this.provider);
    }
}