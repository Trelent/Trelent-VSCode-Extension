import { URLSearchParams } from 'url';
import * as vscode from "vscode";
import { LOGIN_URL, LOGOUT_URL } from "../api/conf";
import { TokenManager } from "../helpers/token";
import { TelemetryService } from './telemetry';

export class AuthenticationService {

  public init(context: vscode.ExtensionContext, telemetry: TelemetryService): void {

    // Register our auth-reated commands
    let loginCmd = vscode.commands.registerCommand('trelent.login', () => {
      try {
        this.authenticate('login');
      } catch (err) {
        console.log(err);
      }
    });
  
    let logoutCmd = vscode.commands.registerCommand('trelent.logout', () => {
      try {
        this.logout(context);
      } catch (err) {
        console.log(err);
      }
    });
  
    let signupCmd = vscode.commands.registerCommand('trelent.signup', () => {
      try {
        this.authenticate('signup');
      } catch (err) {
        // Something went wrong client-side
        telemetry.trackError('Client Error', {
            error: err,
            time: new Date().toISOString()
        });
        console.log(err);
      }
    });

    context.subscriptions.push(loginCmd, logoutCmd, signupCmd);
  }


  public authenticate(mode: string): void {
    vscode.env.openExternal(vscode.Uri.parse(`${LOGIN_URL}?mode=${mode}&scheme=${vscode.env.uriScheme}`));
  }

  public logout(context: vscode.ExtensionContext): void {
    TokenManager.setToken(context, "").then(() => {
      vscode.env.openExternal(vscode.Uri.parse(`${LOGOUT_URL}?scheme=${vscode.env.uriScheme}`));
    });
  }
}