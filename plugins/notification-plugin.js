/**
 * Notification Plugin for SENTINAL
 * Windows toast notifications and reminders
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const plugin = {
    name: 'Notification',
    version: '1.0.0',
    description: 'System notifications and alerts',
    notificationHistory: [],

    async initialize() {
        console.log('[NOTIFICATION] Plugin initialized');
    },

    async cleanup() {
        console.log('[NOTIFICATION] Plugin cleanup');
    },

    canHandle(intent, userInput) {
        return /notify (?:me)?|send (?:a )?notification|alert me|show (?:a )?notification|toast/i.test(userInput);
    },

    async handle(intent, userInput, context) {
        try {
            const message = this.extractMessage(userInput);
            return await this.sendNotification(message);
        } catch (error) {
            console.error('[NOTIFICATION] Error:', error.message);
            return {
                success: false,
                message: `Notification failed, Sir: ${error.message}`
            };
        }
    },

    /**
     * Extract notification message from user input
     */
    extractMessage(userInput) {
        const patterns = [
            /notify (?:me )?"(.+?)"/i,
            /notification "(.+?)"/i,
            /alert (?:me )?"(.+?)"/i,
            /notify (?:me )?(.+?)$/i,
            /send notification (.+?)$/i
        ];

        for (const pattern of patterns) {
            const match = userInput.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return 'Notification from SENTINAL';
    },

    /**
     * Send Windows toast notification
     */
    async sendNotification(message, title = 'SENTINAL') {
        try {
            // Escape message for PowerShell
            const escapedMessage = message.replace(/'/g, "''").replace(/"/g, '""');
            const escapedTitle = title.replace(/'/g, "''").replace(/"/g, '""');

            // PowerShell script to send notification
            const psScript = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

$template = @"
<toast>
    <visual>
        <binding template="ToastGeneric">
            <text>${escapedTitle}</text>
            <text>${escapedMessage}</text>
        </binding>
    </visual>
    <audio src="ms-winsoundevent:Notification.Default"/>
</toast>
"@

$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml($template)
$toast = New-Object Windows.UI.Notifications.ToastNotification $xml
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("SENTINAL").Show($toast)

Write-Output "SUCCESS"
`;

            const command = `powershell -command "${psScript.replace(/"/g, '\\"')}"`;
            await execAsync(command, { timeout: 5000 });

            // Add to history
            this.notificationHistory.unshift({
                message: message,
                title: title,
                timestamp: new Date().toISOString()
            });

            if (this.notificationHistory.length > 50) {
                this.notificationHistory.pop();
            }

            return {
                success: true,
                message: `Notification sent, Sir: "${message}"`,
                data: {
                    message: message,
                    title: title,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Unable to send notification: ${error.message}`
            };
        }
    }
};

export default plugin;
