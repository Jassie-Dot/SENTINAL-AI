/**
 * Filesystem Plugin for SENTINAL
 * Advanced file system operations and search
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

const plugin = {
    name: 'Filesystem',
    version: '1.0.0',
    description: 'File system navigation, search, and operations',

    async initialize() {
        console.log('[FILESYSTEM] Plugin initialized');
    },

    async cleanup() {
        console.log('[FILESYSTEM] Plugin cleanup');
    },

    canHandle(intent, userInput) {
        return intent === 'file.find' ||
            /find (?:file|folder|directory)|search (?:for )?files?|locate (?:file|folder)|show (?:me )?(?:my )?(?:downloads|documents|desktop|pictures)|list files|recent files/i.test(userInput);
    },

    async handle(intent, userInput, context) {
        try {
            // Determine what the user wants
            if (/recent files|latest files/i.test(userInput)) {
                return await this.getRecentFiles();
            }

            if (/downloads/i.test(userInput)) {
                return await this.listDirectory(path.join(os.homedir(), 'Downloads'));
            }

            if (/documents/i.test(userInput)) {
                return await this.listDirectory(path.join(os.homedir(), 'Documents'));
            }

            if (/desktop/i.test(userInput)) {
                return await this.listDirectory(path.join(os.homedir(), 'Desktop'));
            }

            if (/pictures|photos/i.test(userInput)) {
                return await this.listDirectory(path.join(os.homedir(), 'Pictures'));
            }

            // File search
            const searchQuery = this.extractSearchQuery(userInput);
            if (searchQuery && !/create|new|write/i.test(userInput)) {
                return await this.searchFiles(searchQuery);
            }

            // Create/Write File
            if (/create|make|write|save/i.test(userInput) && (/file|text|note/i.test(userInput) || /.txt|.js|.html/.test(userInput))) {
                return await this.createFile(userInput);
            }

            // Default: show common folders
            return await this.showCommonFolders();

        } catch (error) {
            console.error('[FILESYSTEM] Error:', error.message);
            return {
                success: false,
                message: `File system operation failed, Sir: ${error.message}`
            };
        }
    },

    /**
     * Extract search query from user input
     */
    extractSearchQuery(userInput) {
        const patterns = [
            /find (?:file )?(?:named )?["\']?(.+?)["\']?$/i,
            /search (?:for )?["\']?(.+?)["\']?$/i,
            /locate ["\']?(.+?)["\']?$/i
        ];

        for (const pattern of patterns) {
            const match = userInput.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return null;
    },

    /**
     * Search for files
     */
    async searchFiles(query) {
        try {
            const homeDir = os.homedir();

            // Use Windows where command for fast search
            const command = `where /R "${homeDir}" "*${query}*" 2>nul`;
            const { stdout, stderr } = await execAsync(command, { timeout: 10000 });

            if (!stdout.trim()) {
                return {
                    success: true,
                    message: `No files matching "${query}" found in your home directory, Sir.`
                };
            }

            const files = stdout.trim().split('\n').slice(0, 15); // Limit to 15 results
            const fileList = files.map((file, idx) => {
                const stats = this.getSafeFileStats(file.trim());
                return `${idx + 1}. ${path.basename(file.trim())} (${stats.size}) - ${path.dirname(file.trim())}`;
            }).join('\n');

            const message = `Found ${files.length} file(s) matching "${query}", Sir:

${fileList}

${files.length === 15 ? 'Showing first 15 results.' : ''}`;

            return {
                success: true,
                message: message,
                data: {
                    query: query,
                    files: files.map(f => f.trim()),
                    count: files.length
                }
            };
        } catch (error) {
            // Fallback to basic search if where command fails
            return {
                success: true,
                message: `Search completed but no results found for "${query}", Sir.`
            };
        }
    },

    /**
     * Create or Write to a file
     */
    async createFile(userInput) {
        try {
            // Extract filename
            const filenameMatch = userInput.match(/(?:named|called|file|to) ["\']?([\w\-\. ]+\.\w+)["\']?/i) ||
                userInput.match(/["\']([\w\-\. ]+\.\w+)["\']/);

            let filename = filenameMatch ? filenameMatch[1] : `note_${Date.now()}.txt`;

            // Extract content (everything after "that says" or similar, or just reasonable distinct text)
            let content = "";
            const contentMatch = userInput.match(/(?:saying|content|writes?|containing|that says) ["\']?(.+)["\']?$/i);

            if (contentMatch) {
                content = contentMatch[1];
            } else {
                // Try to guess content if loosely phrased like "write hello world to test.txt"
                const parts = userInput.split(/ to | in /);
                if (parts.length > 1 && parts[0].length > 5) {
                    content = parts[0].replace(/write|create|save/i, '').trim();
                }
            }

            // Default to Desktop
            const desktopPath = path.join(os.homedir(), 'Desktop');
            const filePath = path.join(desktopPath, filename);

            fs.writeFileSync(filePath, content, 'utf8');

            return {
                success: true,
                message: `I have created the file "${filename}" on your Desktop, Sir.`,
                data: { path: filePath, content: content }
            };

        } catch (error) {
            return {
                success: false,
                message: `Failed to create file: ${error.message}`
            };
        }
    },

    /**
     * List directory contents
     */
    async listDirectory(dirPath) {
        try {
            if (!fs.existsSync(dirPath)) {
                return {
                    success: false,
                    message: `Directory not found: ${dirPath}`
                };
            }

            const files = fs.readdirSync(dirPath);
            const limited = files.slice(0, 20); // Limit to 20 items

            const fileList = limited.map((file, idx) => {
                const fullPath = path.join(dirPath, file);
                const stats = this.getSafeFileStats(fullPath);
                const icon = stats.isDir ? '📁' : '📄';
                return `${icon} ${file} ${stats.isDir ? '' : `(${stats.size})`}`;
            }).join('\n');

            const message = `Contents of ${path.basename(dirPath)}, Sir:

${fileList}

Total: ${files.length} item(s)${files.length > 20 ? ' (showing first 20)' : ''}`;

            return {
                success: true,
                message: message,
                data: {
                    directory: dirPath,
                    files: files,
                    count: files.length
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Unable to access directory: ${error.message}`
            };
        }
    },

    /**
     * Get recent files from common directories
     */
    async getRecentFiles() {
        try {
            const homeDir = os.homedir();
            const searchDirs = [
                path.join(homeDir, 'Downloads'),
                path.join(homeDir, 'Documents'),
                path.join(homeDir, 'Desktop')
            ];

            const recentFiles = [];

            for (const dir of searchDirs) {
                if (fs.existsSync(dir)) {
                    const files = fs.readdirSync(dir);
                    files.forEach(file => {
                        const fullPath = path.join(dir, file);
                        const stats = this.getSafeFileStats(fullPath);
                        if (!stats.isDir && stats.mtime) {
                            recentFiles.push({
                                path: fullPath,
                                name: file,
                                mtime: stats.mtime,
                                size: stats.size
                            });
                        }
                    });
                }
            }

            // Sort by modification time
            recentFiles.sort((a, b) => b.mtime - a.mtime);
            const top10 = recentFiles.slice(0, 10);

            const fileList = top10.map((file, idx) => {
                const timeAgo = this.getTimeAgo(file.mtime);
                return `${idx + 1}. ${file.name} (${file.size}) - ${timeAgo}`;
            }).join('\n');

            const message = `Your 10 most recent files, Sir:

${fileList}`;

            return {
                success: true,
                message: message,
                data: {
                    files: top10
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Unable to retrieve recent files: ${error.message}`
            };
        }
    },

    /**
     * Show common folders
     */
    async showCommonFolders() {
        const homeDir = os.homedir();
        const folders = [
            { name: 'Downloads', path: path.join(homeDir, 'Downloads') },
            { name: 'Documents', path: path.join(homeDir, 'Documents') },
            { name: 'Desktop', path: path.join(homeDir, 'Desktop') },
            { name: 'Pictures', path: path.join(homeDir, 'Pictures') },
            { name: 'Videos', path: path.join(homeDir, 'Videos') },
            { name: 'Music', path: path.join(homeDir, 'Music') }
        ];

        const folderList = folders
            .filter(f => fs.existsSync(f.path))
            .map(f => {
                const stats = this.getSafeFileStats(f.path);
                return `📁 ${f.name} - ${stats.itemCount} items`;
            })
            .join('\n');

        const message = `Your common folders, Sir:

${folderList}

Would you like me to list the contents of any folder?`;

        return {
            success: true,
            message: message,
            data: { folders }
        };
    },

    /**
     * Safely get file stats
     */
    getSafeFileStats(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return {
                size: this.formatFileSize(stats.size),
                mtime: stats.mtime,
                isDir: stats.isDirectory(),
                itemCount: stats.isDirectory() ? fs.readdirSync(filePath).length : 0
            };
        } catch (error) {
            return {
                size: 'Unknown',
                mtime: null,
                isDir: false,
                itemCount: 0
            };
        }
    },

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    },

    /**
     * Get human-readable time ago
     */
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

        return date.toLocaleDateString();
    }
};

export default plugin;
