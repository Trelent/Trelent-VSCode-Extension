import * as vscode from 'vscode';
const mixpanel = require('mixpanel-browser');

const disabledTrackingMessage = "You have disabled tracking. Please understand that although Trelent " +
 "does not require client-side tracking to function properly, we do track usage of our service " +
 "server-side. To opt-out of server-side tracking, please discontinue use.";
 const errorTrackingMessage = "You have disabled usage tracking. Please understand that although Trelent " +
 "does not require client-side usage tracking to function properly, we do track usage of our service " +
 "server-side. To opt-out of server-side usage tracking, please discontinue use.";
 const crashTrackingMessage = "You have disabled error tracking. Please understand that although Trelent " +
 "does not require client-side tracking to function properly, we do track usage of our service" +
 "server-side. To opt-out of server-side usage tracking, please discontinue use.";

export class TelemetryService {
    trackLevel: number;

    constructor(mixpanelToken: string) {
        // Retrieve current tracking level
        this.trackLevel = getTelemetrySettings();
        console.log("Tracking level: " + this.trackLevel);

        // Initialize mixpanel
        mixpanel.init(mixpanelToken);
    }

    public trackEvent(eventName: string, properties: object) {
        if(this.trackLevel >= 2) {
            mixpanel.track(eventName, properties);
        }
    }
}

function getTelemetrySettings() : number {
    // Get the telemetry level from the user
    let telemLevel = vscode.workspace.getConfiguration('telemetry').get('telemetryLevel');
    switch(telemLevel) {
        case 'all':
            // Good to go
            return 3;
        case 'error':
            // Good to go, but we should let them know that server-side usage
            // tracking is not optional
            vscode.window.showWarningMessage(errorTrackingMessage);
            return 2;
        case 'crash':
            // Disable error tracking, but let them know that server-side usage
            // tracking is not optional again
            vscode.window.showWarningMessage(crashTrackingMessage);
            return 1;
        case 'off':
            // Disable all tracking, but let them know that server-side usage
            // tracking is not optional once again
            vscode.window.showWarningMessage(disabledTrackingMessage);
            return 0;
        default:
            // Good to go
            return 3;
    }
}