/**
 * Process Manager Plugin for SENTINAL
 * Process monitoring and management
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const plugin = {
    name: 'ProcessManager',
    version: '1.0.0',
    description: 'Process monitoring and management',

    async initialize() {
        console.log('[PROCESS-MANAGER] Plugin initialized');
    },

    async cleanup() {
        console.log('[PROCESS-MANAGER] Plugin cleanup');
    },

    canHandle(intent, userInput) {
        return /(?:list|show|display) (?:running )?processes|running (?:apps|applications|programs)|task (?:list|manager)|kill process|stop (?:process|application)/i.test(userInput);
    },

    async handle(intent, userInput, context) {
        try {
            // Kill/stop process
            if (/kill|stop|terminate|close/i.test(userInput)) {
                return await this.killProcess(userInput);
            }

            // List processes
            return await this.listProcesses(userInput);

        } catch (error) {
            console.error('[PROCESS-MANAGER] Error:', error.message);
            return {
                success: false,
                message: `Process management failed, Sir: ${error.message}`
            };
        }
    },

    /**
     * List running processes
     */
    async listProcesses(userInput) {
        try {
            // Get top processes by memory usage
            const command = 'powershell -command "Get-Process | Sort-Object -Property WS -Descending | Select-Object -First 15 ProcessName, @{Name=\'Memory(MB)\';Expression={[Math]::Round($_.WS/1MB,2)}}, CPU | Format-Table -AutoSize"';

            const { stdout, stderr } = await execAsync(command, { timeout: 10000 });

            if (!stdout.trim()) {
                return {
                    success: false,
                    message: "Unable to retrieve process list, Sir."
                };
            }

            const message = `Top 15 processes by memory usage, Sir:

\`\`\`
${stdout.trim()}
\`\`\`

Would you like me to terminate any process? Use: "kill process [name]"`;

            return {
                success: true,
                message: message,
                data: {
                    output: stdout.trim()
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Unable to list processes: ${error.message}`
            };
        }
    },

    /**
     * Kill a process
     */
    async killProcess(userInput) {
        try {
            // Extract process name
            const processPatterns = [
                /kill (?:process )?["\']?(.+?)["\']?$/i,
                /stop (?:process )?["\']?(.+?)["\']?$/i,
                /terminate ["\']?(.+?)["\']?$/i,
                /close ["\']?(.+?)["\']?$/i
            ];

            let processName = null;
            for (const pattern of processPatterns) {
                const match = userInput.match(pattern);
                if (match) {
                    processName = match[1].trim();
                    break;
                }
            }

            if (!processName) {
                return {
                    success: false,
                    message: 'Please specify which process to terminate, Sir. Example: "kill process chrome"'
                };
            }

            // Remove .exe if user included it
            processName = processName.replace(/\.exe$/i, '');

            // SAFETY: Check for critical system processes
            const protectedProcesses = [
                'system', 'csrss', 'winlogon', 'services', 'lsass',
                'svchost', 'explorer', 'dwm', 'wininit', 'smss'
            ];

            if (protectedProcesses.includes(processName.toLowerCase())) {
                return {
                    success: false,
                    message: `I cannot terminate ${processName} as it is a critical system process, Sir. Doing so could crash Windows.`
                };
            }

            // Confirmation required for safety
            const message = `⚠️ CONFIRMATION REQUIRED

You are about to terminate process: ${processName}

This action cannot be undone. The application and any unsaved work will be lost.

To proceed, please say: "confirm kill ${processName}"`;

            // Check if user already confirmed
            if (/confirm kill|yes kill|do it|proceed/i.test(userInput)) {
                // Execute kill command
                const command = `taskkill /F /IM "${processName}.exe"`;
                const { stdout, stderr } = await execAsync(command);

                if (stderr && !stderr.includes('SUCCESS')) {
                    return {
                        success: false,
                        message: `Unable to terminate ${processName}: ${stderr}`
                    };
                }

                return {
                    success: true,
                    message: `Process ${processName} has been terminated, Sir.`,
                    data: {
                        processName: processName,
                        output: stdout
                    }
                };
            }

            // Return confirmation message
            return {
                success: false,
                requiresConfirmation: true,
                message: message,
                data: {
                    processName: processName,
                    confirmCommand: `confirm kill ${processName}`
                }
            };

        } catch (error) {
            return {
                success: false,
                message: `Process termination failed: ${error.message}`
            };
        }
    }
};

export default plugin;
