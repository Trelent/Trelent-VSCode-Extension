import * as vscode from 'vscode'
import { DocstringRecommendation, Function } from '../parser/types';
import { CodeParserService } from '../services/codeParser';

export default class DocstringDecorator implements vscode.Disposable {

    private decorations: { [key: string]: vscode.TextEditorDecorationType } = {};
    private decorationUsesWholeLine: boolean = true;


    constructor() {
        this.registerDocrationTypes()
    }
    

    private registerDocrationTypes(){
        Object.keys(this.decorations).forEach((key) => {
            this.decorations[key].dispose();
        });

        this.decorations = {};

        this.decorations["function.body"] = vscode.window.createTextEditorDecorationType({
            isWholeLine: this.decorationUsesWholeLine,
            backgroundColor: new vscode.ThemeColor('trelent.autodoc.functionColor'),
            
        });

        this.decorations["function.header"] =
          vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor(
              "trelent.autodoc.functionHeadColor"
            ),
            isWholeLine: this.decorationUsesWholeLine,
            after: {
              contentText: " " + vscode.l10n.t("(Trelent: Outdated docstring)"),
              color: new vscode.ThemeColor("descriptionForeground"),
            },
          });
    }

    public applyDocstringRecommendations(functions: Function[], doc: vscode.TextDocument, offsetVal: number = 0){
        if(!functions || functions.length === 0){
            return;
        }

        const editor = vscode.window.visibleTextEditors.find((editor) => editor.document === doc);
        if(!editor){
            return;
        }

        try{

            const matchDecorations: {[key: string]: vscode.Range[]} = {};
            let pushDecorationByRange = (key: string, range:  vscode.Range) => {
                let currDecoration = matchDecorations[key] =  matchDecorations[key] || [];
                currDecoration.push(range);
            };

            let pushDecorationByPosition = (key: string, pos: vscode.Position) => {
                pushDecorationByRange(key, new vscode.Range(pos, pos));
            };

            functions.forEach((func) => {

                let recommendedHeaderPosition = new vscode.Position(func.definition_line + offsetVal, 0);
                let recommendedDocstringPos = doc.offsetAt(recommendedHeaderPosition.translate(1, 0));
                let recommendedDocstringRange = new vscode.Range(doc.positionAt(recommendedDocstringPos), 
                    new vscode.Position(func.range[1][0] + offsetVal, 0));
                //Insert Decorations

                pushDecorationByPosition('function.header', recommendedHeaderPosition);
                pushDecorationByRange('function.body', recommendedDocstringRange);
            });

            Object.keys(matchDecorations).forEach((key) => {
                let decorationType = this.decorations[key];
                if(decorationType){
                    editor.setDecorations(decorationType, matchDecorations[key]);
                }
            });
        }
        finally{}
    }

    public clearDecorations(doc: vscode.TextDocument){
        const editor = vscode.window.visibleTextEditors.find((editor) => editor.document === doc);
        if(!editor){
            return;
        }
        Object.values(this.decorations).forEach((decoration) => {
            editor.setDecorations(decoration, []);
        });
    }


    dispose() {
        Object.keys(this.decorations).forEach(name => {
            this.decorations[name].dispose();
        });
        this.decorations = {};
    }
    
}