import * as vscode from 'vscode'
import { CodeParserService } from '../services/codeParser';
import { DocTag, DocstringRecommendation, Function }  from '../parser/types'
import { DocsService, writeDocstringsFromParsedDocument } from '../services/docs';
import { TelemetryService } from '../services/telemetry';
import { hashFunction, hashID } from './changeDetection';
import DocstringDecorator from './DocstringDecorator';
import { insertDocstrings } from '../helpers/util';

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
                return this.updateDocstrings(document); 
            }
        }

        vscode.languages.registerInlineCompletionItemProvider({pattern: "**"}, this.provider);
    }

    public async updateDocstrings(document: vscode.TextDocument){  
        const editor = vscode.window.visibleTextEditors.find((editor) => editor.document === document);
        if(!editor){
            return;
        }
        if(this.updating.has(document)){
            return;
        }
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

            //Remove ignored functions
            let taggedFunctions: {function: Function, tag: DocTag}[] = this.getFunctionTags(functionsToDocument);

            const trelentConfig = vscode.workspace.getConfiguration("trelent");

            const autodocMode = trelentConfig.get("autodoc.mode");

            const configTag: DocTag = ((): DocTag => {switch(autodocMode){
                case "Enable Per-Function": {
                    return DocTag.IGNORE;
                }
                case "Enable Globally": {
                    return DocTag.HIGHLIGHT;
                }
                case "Maintain Docstrings": {
                    return DocTag.AUTO;
                }
                default:{
                    return DocTag.IGNORE;
                }
            }
            })();

            //Assign default value to NONE tags, and remove IGNORE tags
            taggedFunctions = taggedFunctions.map((tagFunc) => {
                let tag = (tagFunc.tag === DocTag.NONE) ? configTag : tagFunc.tag;
                return {function: tagFunc.function, tag: tag};
            }).filter((tagFunc) => {
                return tagFunc.tag != DocTag.IGNORE
            });

            //If there's no functions
            if(taggedFunctions.length == 0){
                this.updating.delete(document);
                return [];
            }

            //Highlight Functions
            let highlightFunctions = taggedFunctions.filter(tagFunc => tagFunc.tag == DocTag.HIGHLIGHT).map(tagFunc => tagFunc.function);
            if(highlightFunctions.length > 0){
                this.docstringDecorator.applyDocstringRecommendations(highlightFunctions, document);
            }
            
            
            //Auto document functions
            let autoFunctions = taggedFunctions.filter(tagFunc => tagFunc.tag == DocTag.AUTO).map(tagFunc => tagFunc.function);
            if(autoFunctions.length > 0){
                let docstrings = await writeDocstringsFromParsedDocument(this.context, document, autoFunctions, this.telemetryService);
                let reparseFunctions: Function[] = await this.codeParserService.parseNoTrack(document);

                docstrings.filter((docPair) => {
                    return reparseFunctions.find(func => hashFunction(func) == hashFunction(docPair.function));
                }).map((docPair) => {
                    try{
                        docPair.function = reparseFunctions.find(func => hashFunction(func) == hashFunction(docPair.function))!;
                    }
                    finally{}
                    
                })

                let offsetVal = 0;
                for(let docstring of docstrings){
                    try{
                        let func = docstring.function;
                        if(func.docstring_range){
                            let startPointOffset = document.offsetAt(new vscode.Position(func.docstring_range[0][0] + offsetVal, 0));
                            let docstringStartPoint = document.positionAt(startPointOffset - 1);
                            let endPointOffset = document.offsetAt(new vscode.Position(func.docstring_range[1][0] + offsetVal, func.docstring_range[1][1]));
                            let docstringEndPoint = document.positionAt(endPointOffset);
                            let range = new vscode.Range(docstringStartPoint, docstringEndPoint);
                            let docstringSize = (document.getText(range).match(/\n/g) || []).length;
                            await editor?.edit((editBuilder) => {
                                editBuilder.replace(range, "");
                              }).then((success) => {
                                if(success){
                                    offsetVal -= docstringSize;
                                }
                            });
                        }
                    }
                    finally{

                    }
                    
                }

                let insertionDocstrings = docstrings.filter((pair) => {return pair.function.docstring_point})
                .map((docstring) => {
                    let pos = new vscode.Position(docstring.function.docstring_point![0] + offsetVal, docstring.function.docstring_point![1]);
                        return {
                            docstring: docstring.docstring,
                            point: [pos.line, pos.character],
                          };
                });

                await insertDocstrings(insertionDocstrings, editor, document.languageId);
            }
        }
        catch(e){
            console.log(e);
        }
        finally{
            this.updating.delete(document);
            return {};
        }
    }

    private getFunctionTags(functions: Function[]): {function: Function, tag: DocTag}[] {
        let tagMatching: {function: Function, tag: DocTag}[] = [];

        for(let func of functions){
            let match = func.body.match(new RegExp(this.AUTODOC_AUTO_TAG + "|" + this.AUTODOC_IGNORE_TAG + "|" + this.AUTO_DOC_HIGHLIGHT_TAG, "g"));
            if(match != null){
                switch(match[0]){
                    case this.AUTODOC_AUTO_TAG: {
                        tagMatching.push({function: func, tag: DocTag.AUTO});
                        break;
                    }
                    case this.AUTODOC_IGNORE_TAG: {
                        tagMatching.push({function: func, tag: DocTag.IGNORE});
                        break;
                    }
                    case this.AUTO_DOC_HIGHLIGHT_TAG: {
                        tagMatching.push({function: func, tag: DocTag.HIGHLIGHT});
                        break;
                    }
                    default: {
                        tagMatching.push({function: func, tag: DocTag.NONE});
                        break;
                    }
                }
            }
            else{
                tagMatching.push({function: func, tag:  DocTag.NONE});
            }
        }
        return tagMatching;
    }
}