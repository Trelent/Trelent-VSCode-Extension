import * as fs from 'fs';
import * as vscode from "vscode";
import { CodeParserService } from '../../../services/codeParser';

const ext = vscode.extensions.getExtension("Trelent.trelent");

var codeParserService = new CodeParserService(ext);
