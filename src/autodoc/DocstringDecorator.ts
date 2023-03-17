import * as vscode from 'vscode'
import { DocstringRecommendation, Function } from '../parser/types';
import { IExtensionConfiguration } from './interfaces';

export default class DocstringDecorator implements vscode.Disposable {

    private decorations: { [key: string]: vscode.TextEditorDecorationType } = {};
    private decorationUsesWholeLine: boolean = true;

    private updating = new Set<vscode.TextEditor>();


    constructor(private context: vscode.ExtensionContext) {
        this.registerDocrationTypes({recommendDocstringUpdates: true})
    }
    

    private registerDocrationTypes(config: IExtensionConfiguration){
        Object.keys(this.decorations).forEach((key) => {
            this.decorations[key].dispose();
        });

        this.decorations = {};

        if(!config.recommendDocstringUpdates){
            return;
        }

        this.decorations["current.docstring"] = vscode.window.createTextEditorDecorationType({
            isWholeLine: this.decorationUsesWholeLine,
            backgroundColor: new vscode.ThemeColor('trelent.autodoc.currentColor'),
        });

        this.decorations["recommended.docstring"] = vscode.window.createTextEditorDecorationType({
            isWholeLine: this.decorationUsesWholeLine,
            backgroundColor: new vscode.ThemeColor('trelent.autodoc.recommendationColor'),
            
        });

        this.decorations['current.header'] = vscode.window.createTextEditorDecorationType({
            isWholeLine: this.decorationUsesWholeLine,
            backgroundColor: new vscode.ThemeColor('trelent.autodoc.currentHeaderColor'),
            color: new vscode.ThemeColor('editor.foreground'),
            outlineStyle: 'solid',
            outlineWidth: '1pt',
            outlineColor: new vscode.ThemeColor('merge.border'),
            after: {
                contentText: ' ' + vscode.l10n.t("(Current Docstring)"),
                color: new vscode.ThemeColor('descriptionForeground')
            }
        });

        this.decorations['splitter'] = vscode.window.createTextEditorDecorationType({
            color: new vscode.ThemeColor('editor.foreground'),
            outlineStyle: 'solid',
            outlineWidth: '1pt',
            outlineColor: new vscode.ThemeColor('merge.border'),
            isWholeLine: this.decorationUsesWholeLine,
        });

        this.decorations['recommended.header'] = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('trelent.autodoc.recommendationHeaderColor'),
            color: new vscode.ThemeColor('editor.foreground'),
            outlineStyle: 'solid',
            outlineWidth: '1pt',
            outlineColor: new vscode.ThemeColor('merge.border'),
            isWholeLine: this.decorationUsesWholeLine,
            after: {
                contentText: ' ' + vscode.l10n.t("\n(Recommended Docstring)"),
                color: new vscode.ThemeColor('descriptionForeground')
            }
        });
    }

    public applyDocstringRecommendations(functions: DocstringRecommendation[], doc: vscode.TextDocument){
        if(!functions || functions.length === 0){
            return;
        }

        const editor = vscode.window.visibleTextEditors.find((editor) => editor.document === doc);
        if(!editor){
            return;
        }

        if(this.updating.has(editor)){
            return;
        }

        try{

            this.updating.add(editor);

            const matchDecorations: {[key: string]: vscode.Range[]} = {};
            let pushDecorationByRange = (key: string, range: vscode.Range) => {
                matchDecorations[key] = matchDecorations[key] || [];
                matchDecorations[key].push(range);
            };

            let pushDecorationByPosition = (key: string, position: vscode.Position) => {
                pushDecorationByRange(key, new vscode.Range(position, position));
            };

            functions.forEach((docRec) => {
                if(!docRec.recommendedDocstring){
                    return;
                }

                const func = docRec.function;
                const recommendedDocstring = docRec.recommendedDocstring;

                let currentDocstringRange: vscode.Range | null, recommendedDocstringPosition: vscode.Position, currentHeaderPosition: vscode.Position | null, recommendedHeaderPosition: vscode.Position;
                if(func.docstring_range){

                    //Existing docstring position data
                    currentDocstringRange =  new vscode.Range(
                        new vscode.Position(func.docstring_range[0][0], func.docstring_range[0][1]),
                        new vscode.Position(func.docstring_range[1][0], func.docstring_range[1][1]));
                        
                    
                    const currHeaderPos = doc.offsetAt(currentDocstringRange.end) + 1;
                    currentHeaderPosition = doc.positionAt(currHeaderPos);

                    //recommended docstring position data
                    recommendedHeaderPosition = new vscode.Position(currentDocstringRange.start.line, 0);
                    const recommendedDocstringPos = doc.offsetAt(currentDocstringRange.start) + 1;
                    recommendedDocstringPosition = doc.positionAt(recommendedDocstringPos);

        
                }
                else{
                    currentDocstringRange = null;
                    currentHeaderPosition = null;

                    recommendedHeaderPosition = new vscode.Position(func.range[0][0], func.range[0][1]);
                    const recommendedDocstringPos = doc.offsetAt(recommendedHeaderPosition) + 1;
                    recommendedDocstringPosition = doc.positionAt(recommendedDocstringPos);
                }
                //Insert Decorations

                if(currentDocstringRange){
                    pushDecorationByRange('current.docstring', currentDocstringRange);
                    pushDecorationByPosition('current.header', currentHeaderPosition!);
                }
                pushDecorationByPosition('recommended.header', recommendedHeaderPosition);
                pushDecorationByPosition('recommended.docstring', recommendedDocstringPosition);
        });

        Object.keys(matchDecorations).forEach((key) => {
            const decorationType = this.decorations[key];
            if(decorationType){
                editor.setDecorations(decorationType, matchDecorations[key]);
            }
        });
    }
    finally{
        this.updating.delete(editor);
    }
}


    dispose() {
        Object.keys(this.decorations).forEach(name => {
            this.decorations[name].dispose();
        });
        this.decorations = {};
    }
    
}