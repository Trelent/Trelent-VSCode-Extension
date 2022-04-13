import * as vscode from "vscode";

const KEY = "access_token";

export class TokenManager {
  static setToken(context: vscode.ExtensionContext, token: string) {
    return context.secrets.store(KEY, token);
  }

  static async getToken(context: vscode.ExtensionContext): Promise<string> {
    try {
      let token = await context.secrets.get(KEY);
      if(token === undefined) {
        token = "";
      }

      return token;
    }
    catch(error) {
      console.error(error);
      return "";
    }
  }
}