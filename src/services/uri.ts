import { URLSearchParams } from 'url';
import * as vscode from "vscode";
import { TelemetryService } from '../services/telemetry';
import { TokenManager } from "../helpers/token";

export class URIService {

    public init(context: vscode.ExtensionContext, telemetry: TelemetryService): void {
        var handler = vscode.window.registerUriHandler({
            async handleUri(uri: vscode.Uri) {
                try {
                    if (uri.path === '/login') {
                        const query = new URLSearchParams(uri.query);
                        const token = query.get('token');
                        
                        if (!token) {
                            vscode.window.showErrorMessage("Authentication failed! Please try again.");
                            return;
                        }
            
                        await TokenManager.setToken(context, token);
                        vscode.window.showInformationMessage(`Login successful!`);
                    }
                    else if (uri.path === '/logout') {
                        vscode.window.showInformationMessage("You have been logged out of Trelent.");
                    }
                    else if (uri.path === '/checkout') {
                        const query = new URLSearchParams(uri.query);
                        const event = query.get('event');
                        
                        if (!event) {
                            vscode.window.showInformationMessage("Thank you for upgrading your account! Enjoy 1,000 docs/month, and more features coming every month! Please allow for up to 5 minutes for your account to be upgraded.");
                            return;
                        }
                        
                        switch(event) {
                            case 'upgrade':
                                vscode.window.showInformationMessage("Thank you for upgrading your account! Enjoy 1,000 docs/month, and more features coming every month!");
                            case 'cancel':
                                vscode.window.showInformationMessage("Your subscription has been cancelled. You will not be charged again. You will still get 100 free docs/month.");
                            default:
                                vscode.window.showInformationMessage("Your billing information has been updated.");
                        }
                    }
                    else if(uri.path === '/portal') {
                        vscode.window.showInformationMessage("Your billing information has been updated.");
                    }
                }
                catch (error: any) {
                    // Something went wrong client-side
                    telemetry.trackError('Client Error', {
                        error: error,
                        time: new Date().toISOString()
                    });
                    
                    vscode.window.showErrorMessage("An error occurred while processing your request. Please try again.");
                }
                
            }
        });

        context.subscriptions.push(handler);
    }
}