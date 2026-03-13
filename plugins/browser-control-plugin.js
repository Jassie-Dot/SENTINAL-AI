/**
 * Browser Control Plugin for SENTINAL
 * Web browser automation and control
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const plugin = {
    name: 'BrowserControl',
    version: '1.0.0',
    description: 'Browser automation and web navigation',

    async initialize() {
        console.log('[BROWSER] Plugin initialized');
    },

    async cleanup() {
        console.log('[BROWSER] Plugin cleanup');
    },

    canHandle(intent, userInput) {
        return intent === 'search.web' ||
            /open (?:url|website|link)|browse to|go to|search (?:for|the web)|google|youtube|navigate to/i.test(userInput);
    },

    async handle(intent, userInput, context) {
        try {
            // Check for specific websites
            if (/youtube/i.test(userInput)) {
                return await this.openUrl('https://www.youtube.com', 'YouTube');
            }

            if (/github/i.test(userInput)) {
                return await this.openUrl('https://www.github.com', 'GitHub');
            }

            if (/gmail|email/i.test(userInput)) {
                return await this.openUrl('https://mail.google.com', 'Gmail');
            }

            // Check for URL patterns
            const urlMatch = userInput.match(/(https?:\/\/[^\s]+)/i);
            if (urlMatch) {
                return await this.openUrl(urlMatch[1]);
            }

            // Check for web search
            if (/search|google|find|look up/i.test(userInput)) {
                const query = this.extractSearchQuery(userInput);
                return await this.searchWeb(query);
            }

            // Default: treat as web search
            return await this.searchWeb(userInput);

        } catch (error) {
            console.error('[BROWSER] Error:', error.message);
            return {
                success: false,
                message: `Browser operation failed, Sir: ${error.message}`
            };
        }
    },

    /**
     * Extract search query from user input
     */
    extractSearchQuery(userInput) {
        const patterns = [
            /search (?:for |the web )?["\']?(.+?)["\']?$/i,
            /google ["\']?(.+?)["\']?$/i,
            /look up ["\']?(.+?)["\']?$/i,
            /find (?:information about |out about )?["\']?(.+?)["\']?$/i,
            /what is ["\']?(.+?)["\']?$/i,
            /who is ["\']?(.+?)["\']?$/i
        ];

        for (const pattern of patterns) {
            const match = userInput.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return userInput;
    },

    /**
     * Open URL in default browser
     */
    async openUrl(url, name = null) {
        try {
            // Ensure URL has protocol
            if (!url.match(/^https?:\/\//i)) {
                url = 'https://' + url;
            }

            // Use Windows 'start' command to open URL
            const command = `start "" "${url}"`;
            await execAsync(command);

            const displayName = name || url;

            return {
                success: true,
                message: `Opening ${displayName} in your browser, Sir.`,
                data: {
                    url: url,
                    name: displayName
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Unable to open browser: ${error.message}`
            };
        }
    },

    /**
     * Search the web
     */
    async searchWeb(query) {
        try {
            if (!query || query.trim() === '') {
                return {
                    success: false,
                    message: "Please specify what to search for, Sir."
                };
            }

            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

            const command = `start "" "${searchUrl}"`;
            await execAsync(command);

            return {
                success: true,
                message: `Searching for "${query}" on Google, Sir.`,
                data: {
                    query: query,
                    url: searchUrl
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Web search failed: ${error.message}`
            };
        }
    }
};

export default plugin;
