import * as vscode from "vscode";
const mixpanel = require("mixpanel-browser");

const disabledTrackingMessage =
  "You have disabled tracking. Please understand that although Trelent " +
  "does not require tracking for tracking documentation progress, we do need" +
  "to send data server-side for generating docs. To use Trelent for generating" +
  "docstrings, please update your tracking settings.";
const errorTrackingMessage =
  "You have disabled usage tracking. Please understand that although Trelent " +
  "does not require client-side usage tracking to function properly, we do track usage of our service " +
  "server-side. To opt-out of server-side usage tracking, please discontinue use.";
const crashTrackingMessage =
  "You have disabled error tracking. Please understand that although Trelent " +
  "does not require client-side tracking to function properly, we do track usage of our service" +
  "server-side. To opt-out of server-side usage tracking, please discontinue use.";

export class TelemetryService {
  public trackLevel: number;

  constructor(mixpanelToken: string) {
    // Retrieve current tracking level
    this.trackLevel = getTelemetrySettings();

    // Initialize mixpanel
    mixpanel.init(mixpanelToken, { debug: true });
    mixpanel.identify(vscode.env.machineId);

    // Persist tracking setting changes.
    vscode.workspace.onDidChangeConfiguration(() => {
      this.trackLevel = getTelemetrySettings();
    });

    vscode.env.onDidChangeTelemetryEnabled(() => {
      this.trackLevel = getTelemetrySettings();
    });
  }

  public trackEvent(eventName: string, properties: object) {
    if (this.trackLevel >= 2) {
      mixpanel.track(eventName, properties);
    }
  }

  public canSendServerData(): boolean {
    return this.trackLevel >= 1;
  }
}

function getTelemetrySettings(): number {
  // Is telemetry enabled?
  if (!vscode.env.isTelemetryEnabled) {
    // Disable all tracking, but let them know that server-side usage
    // tracking is not optional once again
    vscode.window.showWarningMessage(disabledTrackingMessage);
    return 0;
  }

  // Check deeper telem levels
  let telemLevel = vscode.workspace
    .getConfiguration("telemetry")
    .get("telemetryLevel");
  switch (telemLevel) {
    case "all":
      // Good to go
      return 3;
    case "error":
      // Good to go, but we should let them know that server-side usage
      // tracking is not optional
      vscode.window.showWarningMessage(errorTrackingMessage);
      return 2;
    case "crash":
      // Disable error tracking, but let them know that server-side usage
      // tracking is not optional again
      vscode.window.showWarningMessage(crashTrackingMessage);
      return 1;
    case "off":
      // Disable all tracking, but let them know that server-side usage
      // tracking is not optional once again
      vscode.window.showWarningMessage(disabledTrackingMessage);
      return 0;
    default:
      // Good to go
      return 3;
  }
}

let service: TelemetryService;

export let createTelemetryService = (mixpanelToken: string) => {
  if (!service) {
    service = new TelemetryService(mixpanelToken);
  }
  return service;
}

export let getTelemetryService = () => {
  return service;
}