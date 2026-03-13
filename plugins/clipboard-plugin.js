/**
 * Clipboard Plugin for SENTINAL
 * Clipboard reading, writing, and history management
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const plugin = {
    name: 'Clipboard',
    version: '1.0.0',
    description: 'Clipboard management and history',
    history: [],
    maxHistory: 20,

    async initialize() {
        console.log('[CLIPBOARD] Plugin initialized');
    },

    async cleanup() {
        console.log('[CLIPBOARD] Plugin cleanup');
    },

    canHandle(intent, userInput) {
        return /clipboard|copy|paste|what.?(?:is|did i) (?:copy|copied)|show clipboard/i.test(userInput);
    },

    async handle(intent, userInput, context) {
        try {
            // Determine action
            if (/copy|write to clipboard|set clipboard/i.test(userInput)) {
                return await this.writeClipboard(userInput);
            }

            if (/history|previous|last copied/i.test(userInput)) {
                return await this.showHistory();
            }

            // Default: read clipboard
            return await this.readClipboard();

        } catch (error) {
            console.error('[CLIPBOARD] Error:', error.message);
            return {
                success: false,
                message: `Clipboard operation failed, Sir: ${error.message}`
            };
        }
    },

    /**
     * Read clipboard content
     */
    async readClipboard() {
        try {
            // PowerShell command to read clipboard
            const command = 'powershell -command "Get-Clipboard"';
            const { stdout, stderr } = await execAsync(command);

            const content = stdout.trim();

            if (!content) {
                return {
                    success: true,
                    message: "Clipboard is empty, Sir."
                };
            }

            // Add to history if new
            if (this.history.length === 0 || this.history[0] !== content) {
                this.history.unshift(content);
                if (this.history.length > this.maxHistory) {
                    this.history.pop();
                }
            }

            // Truncate if too long for display
            const displayContent = content.length > 500
                ? content.substring(0, 500) + '...'
                : content;

            const message = `Clipboard content, Sir:

${displayContent}

${content.length > 500 ? `(${content.length} characters total)` : ''}`;

            return {
                success: true,
                message: message,
                data: {
                    content: content,
                    length: content.length,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Unable to read clipboard: ${error.message}`
            };
        }
    },

    /**
     * Write to clipboard
     */
    async writeClipboard(userInput) {
        try {
            // Extract text to copy
            const patterns = [
                /copy ["\'](.+?)["\']/i,
                /write ["\'](.+?)["\']/i,
                /set clipboard to ["\'](.+?)["\']/i
            ];

            let textToCopy = null;
            for (const pattern of patterns) {
                const match = userInput.match(pattern);
                if (match) {
                    textToCopy = match[1];
                    break;
                }
            }

            if (!textToCopy) {
                return {
                    success: false,
                    message: 'Please specify what to copy, Sir. Example: "copy \'Hello World\'"'
                };
            }

            // Escape text for PowerShell
            const escapedText = textToCopy.replace(/'/g, "''");

            // PowerShell command to write to clipboard
            const command = `powershell -command "Set-Clipboard -Value '${escapedText}'"`;
            await execAsync(command);

            // Add to history
            this.history.unshift(textToCopy);
            if (this.history.length > this.maxHistory) {
                this.history.pop();
            }

            return {
                success: true,
                message: `Copied to clipboard, Sir: "${textToCopy}"`,
                data: {
                    content: textToCopy
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Unable to write to clipboard: ${error.message}`
            };
        }
    },

    /**
     * Show clipboard history
     */
    async showHistory() {
        if (this.history.length === 0) {
            return {
                success: true,
                message: "No clipboard history available yet, Sir."
            };
        }

        const historyList = this.history.slice(0, 10).map((item, idx) => {
            const preview = item.length > 60 ? item.substring(0, 60) + '...' : item;
            return `${idx + 1}. ${preview}`;
        }).join('\n\n');

        const message = `Recent clipboard history, Sir:

${historyList}

${this.history.length > 10 ? `(${this.history.length} total items)` : ''}`;

        return {
            success: true,
            message: message,
            data: {
                history: this.history.slice(0, 10)
            }
        };
    }
};

export default plugin;
