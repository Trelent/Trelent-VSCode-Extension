import * as vscode from 'vscode'
import { ChangeDetectionService } from '../services/changeDetection';
import { IExtensionConfiguration } from './interfaces';

export default class DocstringDecorator implements vscode.Disposable {

    private decorations: { [key: string]: vscode.TextEditorDecorationType } = {};
    private decorationUsesWholeLine: boolean = true;
    private changeDetectionService: ChangeDetectionService;


    constructor(private context: vscode.ExtensionContext, changeDetectionService: ChangeDetectionService) {
        this.changeDetectionService = changeDetectionService;
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
                contentText: ' ' + vscode.l10n.t("(Recommended Docstring)"),
                color: new vscode.ThemeColor('descriptionForeground')
            }
        });
    }


    dispose() {
        Object.keys(this.decorations).forEach(name => {
            this.decorations[name].dispose();
        });
        this.decorations = {};
    }
    
}