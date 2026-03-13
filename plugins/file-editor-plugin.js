/**
 * File Editor Plugin for SENTINAL
 * ==============================
 * Advanced file editing capabilities:
 * - Read file contents
 * - Write/create files
 * - Edit specific lines or sections
 * - Open files in default editor
 * - Find and replace in files
 * - Insert content at specific locations
 * - Code-aware editing (preserves indentation)
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

const plugin = {
    name: 'FileEditor',
    version: '1.0.0',
    description: 'Advanced file editing and manipulation capabilities',

    async initialize() {
        console.log('[FILE-EDITOR] Plugin initialized');
    },

    async cleanup() {
        console.log('[FILE-EDITOR] Plugin cleanup');
    },

    canHandle(intent, userInput) {
        const patterns = [
            /(?:open|edit|read|show|view|display)\s+(?:the\s+)?(?:file|code|content)/i,
            /(?:modify|change|update|edit)\s+(?:the\s+)?(?:file|code|line)/i,
            /(?:write|save|create|add)\s+(?:to|into|in)\s+(?:the\s+)?(?:file|code)/i,
            /(?:append|insert|add)\s+(?:to|into|at|after|before)/i,
            /(?:replace|find\s+and\s+replace|substitute)/i,
            /(?:delete|remove)\s+(?:line|lines|from\s+file)/i,
            /\.(?:js|ts|py|html|css|json|txt|md|jsx|tsx|java|cpp|c|h|xml|yaml|yml|ini|cfg|log)(?:\s|$)/i
        ];

        return patterns.some(pattern => pattern.test(userInput));
    },

    async handle(intent, userInput, context) {
        try {
            const lowerInput = userInput.toLowerCase();

            // Open file in default editor
            if (/(?:^|\s)open\s+/i.test(userInput) && !(/read|show|view|display/.test(lowerInput))) {
                return await this.openFileInEditor(userInput);
            }

            // Read/Show file contents
            if (/read|show|view|display|what('s| is) in/i.test(lowerInput)) {
                return await this.readFile(userInput);
            }

            // Replace/Find and replace
            if (/replace|find\s+and\s+replace|substitute/i.test(lowerInput)) {
                return await this.findAndReplace(userInput);
            }

            // Delete lines
            if (/delete|remove/i.test(lowerInput) && /line/i.test(lowerInput)) {
                return await this.deleteLines(userInput);
            }

            // Insert/Append content
            if (/insert|append|add\s+(?:to|into|at|after|before)/i.test(lowerInput)) {
                return await this.insertContent(userInput);
            }

            // Modify/Edit file (general editing)
            if (/modify|change|update|edit/i.test(lowerInput)) {
                return await this.editFile(userInput);
            }

            // Write/Create file
            if (/write|save|create/i.test(lowerInput)) {
                return await this.writeFile(userInput);
            }

            // Default: try to detect file path and show options
            return await this.showFileOptions(userInput);

        } catch (error) {
            console.error('[FILE-EDITOR] Error:', error.message);
            return {
                success: false,
                message: `File operation failed, Sir: ${error.message}`
            };
        }
    },

    /**
     * Extract file path from user input
     */
    extractFilePath(userInput) {
        // Match quoted paths
        let match = userInput.match(/["']([^"']+\.\w+)["']/);
        if (match) return match[1];

        // Match paths with backslashes or forward slashes
        match = userInput.match(/([a-zA-Z]:\\[^\s"'<>|]+\.\w+)/i);
        if (match) return match[1];

        match = userInput.match(/(\/[^\s"'<>|]+\.\w+)/);
        if (match) return match[1];

        // Match simple filenames with extensions
        match = userInput.match(/(?:file\s+)?([a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)/i);
        if (match) return match[1];

        return null;
    },

    /**
     * Resolve file path (handle relative paths)
     */
    resolvePath(filePath) {
        if (!filePath) return null;

        // Already absolute
        if (path.isAbsolute(filePath)) {
            return filePath;
        }

        // Check common locations
        const searchPaths = [
            process.cwd(),
            os.homedir(),
            path.join(os.homedir(), 'Desktop'),
            path.join(os.homedir(), 'Documents'),
            path.join(os.homedir(), 'Downloads')
        ];

        for (const basePath of searchPaths) {
            const fullPath = path.join(basePath, filePath);
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
        }

        // Return path relative to cwd
        return path.join(process.cwd(), filePath);
    },

    /**
     * Read file contents
     */
    async readFile(userInput) {
        const filePath = this.extractFilePath(userInput);
        if (!filePath) {
            return {
                success: false,
                message: "I couldn't identify the file you want to read, Sir. Please specify the file path."
            };
        }

        const resolvedPath = this.resolvePath(filePath);

        if (!fs.existsSync(resolvedPath)) {
            return {
                success: false,
                message: `File not found: ${filePath}. Would you like me to create it?`
            };
        }

        try {
            const content = fs.readFileSync(resolvedPath, 'utf8');
            const lines = content.split('\n');
            const lineCount = lines.length;

            // Extract line range if specified
            const rangeMatch = userInput.match(/lines?\s+(\d+)(?:\s*(?:to|-)\s*(\d+))?/i);
            let displayContent = content;
            let rangeInfo = '';

            if (rangeMatch) {
                const startLine = parseInt(rangeMatch[1], 10);
                const endLine = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : startLine;
                displayContent = lines.slice(startLine - 1, endLine).join('\n');
                rangeInfo = ` (Lines ${startLine}-${endLine})`;
            } else if (lines.length > 50) {
                // Truncate long files
                displayContent = lines.slice(0, 50).join('\n') + '\n\n... (truncated, showing first 50 lines)';
            }

            // Add line numbers
            const numberedContent = displayContent.split('\n')
                .map((line, idx) => {
                    const lineNum = rangeMatch ? parseInt(rangeMatch[1], 10) + idx : idx + 1;
                    return `${lineNum.toString().padStart(4, ' ')} | ${line}`;
                })
                .join('\n');

            return {
                success: true,
                message: `**${path.basename(resolvedPath)}**${rangeInfo} (${lineCount} lines total):\n\n\`\`\`\n${numberedContent}\n\`\`\``,
                data: {
                    path: resolvedPath,
                    content: content,
                    lineCount: lineCount
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to read file: ${error.message}`
            };
        }
    },

    /**
     * Write/Create a file
     */
    async writeFile(userInput) {
        const filePath = this.extractFilePath(userInput);
        if (!filePath) {
            return {
                success: false,
                message: "Please specify the file name/path, Sir."
            };
        }

        // Extract content to write
        let content = '';

        // Match content in quotes
        let contentMatch = userInput.match(/(?:with\s+content|containing|saying|content|write)\s*[:=]?\s*["'`](.+?)["'`]/is);
        if (contentMatch) {
            content = contentMatch[1];
        } else {
            // Try to extract content after common keywords
            contentMatch = userInput.match(/(?:with|containing|saying)\s+(.+?)(?:\s+to\s+|\s+in\s+|$)/i);
            if (contentMatch) {
                content = contentMatch[1];
            }
        }

        const resolvedPath = this.resolvePath(filePath);

        // Create directory if it doesn't exist
        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        try {
            fs.writeFileSync(resolvedPath, content, 'utf8');

            return {
                success: true,
                message: `File **${path.basename(resolvedPath)}** has been created/updated at:\n\`${resolvedPath}\``,
                data: {
                    path: resolvedPath,
                    content: content
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to write file: ${error.message}`
            };
        }
    },

    /**
     * Edit file - modify specific portions
     */
    async editFile(userInput) {
        const filePath = this.extractFilePath(userInput);
        if (!filePath) {
            return {
                success: false,
                message: "Please specify the file you want to edit, Sir."
            };
        }

        const resolvedPath = this.resolvePath(filePath);

        if (!fs.existsSync(resolvedPath)) {
            return {
                success: false,
                message: `File not found: ${filePath}`
            };
        }

        // Check for line-specific edit
        const lineMatch = userInput.match(/line\s+(\d+)/i);
        if (lineMatch) {
            const lineNum = parseInt(lineMatch[1], 10);
            return await this.editLine(resolvedPath, lineNum, userInput);
        }

        // General edit - need more context
        return {
            success: true,
            message: `To edit **${path.basename(resolvedPath)}**, please specify:\n\n` +
                `• "Edit line X to say ..."\n` +
                `• "Replace 'old text' with 'new text' in file"\n` +
                `• "Add 'content' at line X"\n` +
                `• "Delete lines X to Y"`,
            data: { path: resolvedPath }
        };
    },

    /**
     * Edit a specific line
     */
    async editLine(filePath, lineNum, userInput) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');

            if (lineNum < 1 || lineNum > lines.length) {
                return {
                    success: false,
                    message: `Line ${lineNum} is out of range. File has ${lines.length} lines.`
                };
            }

            // Extract new content for the line
            const newContentMatch = userInput.match(/(?:to\s+(?:say\s+)?|with\s+|=\s*|:\s*)["'`]?(.+?)["'`]?\s*$/i);

            if (!newContentMatch) {
                return {
                    success: true,
                    message: `Line ${lineNum} currently contains:\n\`\`\`\n${lines[lineNum - 1]}\n\`\`\`\n\nWhat would you like to change it to?`,
                    data: { currentContent: lines[lineNum - 1] }
                };
            }

            const newContent = newContentMatch[1];
            const oldLine = lines[lineNum - 1];
            lines[lineNum - 1] = newContent;

            fs.writeFileSync(filePath, lines.join('\n'), 'utf8');

            return {
                success: true,
                message: `Line ${lineNum} updated in **${path.basename(filePath)}**:\n\n` +
                    `**Before:** \`${oldLine}\`\n` +
                    `**After:** \`${newContent}\``,
                data: {
                    path: filePath,
                    lineNumber: lineNum,
                    oldContent: oldLine,
                    newContent: newContent
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to edit line: ${error.message}`
            };
        }
    },

    /**
     * Find and replace in file
     */
    async findAndReplace(userInput) {
        const filePath = this.extractFilePath(userInput);
        if (!filePath) {
            return {
                success: false,
                message: "Please specify the file for find and replace, Sir."
            };
        }

        const resolvedPath = this.resolvePath(filePath);

        if (!fs.existsSync(resolvedPath)) {
            return {
                success: false,
                message: `File not found: ${filePath}`
            };
        }

        // Extract find and replace patterns
        const patterns = [
            /replace\s+["'`](.+?)["'`]\s+with\s+["'`](.+?)["'`]/i,
            /find\s+["'`](.+?)["'`]\s+(?:and\s+)?replace\s+(?:with\s+)?["'`](.+?)["'`]/i,
            /substitute\s+["'`](.+?)["'`]\s+(?:for|with)\s+["'`](.+?)["'`]/i
        ];

        let findText = null;
        let replaceText = null;

        for (const pattern of patterns) {
            const match = userInput.match(pattern);
            if (match) {
                findText = match[1];
                replaceText = match[2];
                break;
            }
        }

        if (!findText) {
            return {
                success: false,
                message: `Please specify what to find and replace like:\n"Replace 'old text' with 'new text' in file.js"`
            };
        }

        try {
            const content = fs.readFileSync(resolvedPath, 'utf8');
            const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const matches = (content.match(regex) || []).length;

            if (matches === 0) {
                return {
                    success: true,
                    message: `No occurrences of "${findText}" found in **${path.basename(resolvedPath)}**.`
                };
            }

            const newContent = content.replace(regex, replaceText);
            fs.writeFileSync(resolvedPath, newContent, 'utf8');

            return {
                success: true,
                message: `Replaced **${matches}** occurrence(s) of "${findText}" with "${replaceText}" in **${path.basename(resolvedPath)}**.`,
                data: {
                    path: resolvedPath,
                    findText,
                    replaceText,
                    matchCount: matches
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Find and replace failed: ${error.message}`
            };
        }
    },

    /**
     * Insert content at specific location
     */
    async insertContent(userInput) {
        const filePath = this.extractFilePath(userInput);
        if (!filePath) {
            return {
                success: false,
                message: "Please specify the file, Sir."
            };
        }

        const resolvedPath = this.resolvePath(filePath);

        if (!fs.existsSync(resolvedPath)) {
            return {
                success: false,
                message: `File not found: ${filePath}`
            };
        }

        // Extract line number
        const lineMatch = userInput.match(/(?:at|after|before)\s+line\s+(\d+)/i);
        const position = userInput.match(/(after|before)/i)?.[1]?.toLowerCase() || 'after';

        // Extract content to insert
        const contentMatch = userInput.match(/(?:insert|add|append)\s+["'`](.+?)["'`]/is);

        if (!contentMatch) {
            return {
                success: false,
                message: `Please specify the content to insert like:\nInsert "new content" at line 5 in file.js`
            };
        }

        const insertContent = contentMatch[1];

        try {
            const content = fs.readFileSync(resolvedPath, 'utf8');
            const lines = content.split('\n');

            if (lineMatch) {
                const lineNum = parseInt(lineMatch[1], 10);
                const insertIndex = position === 'before' ? lineNum - 1 : lineNum;

                if (insertIndex < 0 || insertIndex > lines.length) {
                    return {
                        success: false,
                        message: `Line ${lineNum} is out of range. File has ${lines.length} lines.`
                    };
                }

                lines.splice(insertIndex, 0, insertContent);
            } else {
                // Append to end
                lines.push(insertContent);
            }

            fs.writeFileSync(resolvedPath, lines.join('\n'), 'utf8');

            return {
                success: true,
                message: `Content inserted into **${path.basename(resolvedPath)}** ${lineMatch ? `at line ${lineMatch[1]}` : 'at the end'}.`,
                data: {
                    path: resolvedPath,
                    insertedContent: insertContent
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Insert failed: ${error.message}`
            };
        }
    },

    /**
     * Delete lines from file
     */
    async deleteLines(userInput) {
        const filePath = this.extractFilePath(userInput);
        if (!filePath) {
            return {
                success: false,
                message: "Please specify the file, Sir."
            };
        }

        const resolvedPath = this.resolvePath(filePath);

        if (!fs.existsSync(resolvedPath)) {
            return {
                success: false,
                message: `File not found: ${filePath}`
            };
        }

        // Extract line range
        const rangeMatch = userInput.match(/lines?\s+(\d+)(?:\s*(?:to|-)\s*(\d+))?/i);

        if (!rangeMatch) {
            return {
                success: false,
                message: "Please specify which line(s) to delete, like:\n\"Delete line 5 from file.js\" or \"Delete lines 5-10\""
            };
        }

        const startLine = parseInt(rangeMatch[1], 10);
        const endLine = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : startLine;

        try {
            const content = fs.readFileSync(resolvedPath, 'utf8');
            const lines = content.split('\n');

            if (startLine < 1 || endLine > lines.length || startLine > endLine) {
                return {
                    success: false,
                    message: `Invalid line range. File has ${lines.length} lines.`
                };
            }

            const deletedLines = lines.splice(startLine - 1, endLine - startLine + 1);
            fs.writeFileSync(resolvedPath, lines.join('\n'), 'utf8');

            return {
                success: true,
                message: `Deleted ${deletedLines.length} line(s) from **${path.basename(resolvedPath)}** (lines ${startLine}-${endLine}).`,
                data: {
                    path: resolvedPath,
                    deletedLines: deletedLines,
                    startLine,
                    endLine
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Delete failed: ${error.message}`
            };
        }
    },

    /**
     * Open file in default editor
     */
    async openFileInEditor(userInput) {
        const filePath = this.extractFilePath(userInput);
        if (!filePath) {
            return {
                success: false,
                message: "Please specify the file to open, Sir."
            };
        }

        const resolvedPath = this.resolvePath(filePath);

        if (!fs.existsSync(resolvedPath)) {
            return {
                success: false,
                message: `File not found: ${filePath}`
            };
        }

        try {
            // Determine the editor to use
            let command;

            // Check for VS Code
            try {
                await execAsync('code --version');
                command = `code "${resolvedPath}"`;
            } catch {
                // Fall back to Windows default
                command = `start "" "${resolvedPath}"`;
            }

            await execAsync(command);

            return {
                success: true,
                message: `Opening **${path.basename(resolvedPath)}** in editor, Sir.`,
                data: { path: resolvedPath }
            };
        } catch (error) {
            // Try Windows start command as fallback
            try {
                await execAsync(`start "" "${resolvedPath}"`);
                return {
                    success: true,
                    message: `Opening **${path.basename(resolvedPath)}** with default application, Sir.`,
                    data: { path: resolvedPath }
                };
            } catch (fallbackError) {
                return {
                    success: false,
                    message: `Failed to open file: ${error.message}`
                };
            }
        }
    },

    /**
     * Show file options
     */
    async showFileOptions(userInput) {
        const filePath = this.extractFilePath(userInput);

        if (filePath) {
            const resolvedPath = this.resolvePath(filePath);
            const exists = fs.existsSync(resolvedPath);

            if (exists) {
                return {
                    success: true,
                    message: `I found **${path.basename(resolvedPath)}**. What would you like to do?\n\n` +
                        `• "Read ${path.basename(filePath)}" - View contents\n` +
                        `• "Open ${path.basename(filePath)}" - Open in editor\n` +
                        `• "Edit line X in ${path.basename(filePath)}" - Edit specific line\n` +
                        `• "Replace 'old' with 'new' in ${path.basename(filePath)}" - Find and replace`,
                    data: { path: resolvedPath }
                };
            } else {
                return {
                    success: true,
                    message: `File **${filePath}** doesn't exist. Would you like me to create it?`,
                    data: { suggestedPath: resolvedPath }
                };
            }
        }

        return {
            success: true,
            message: `I can help you with file operations, Sir. Here's what I can do:\n\n` +
                `**Read:** "Read file.js" or "Show me lines 1-50 in file.js"\n` +
                `**Open:** "Open file.js" (opens in VS Code or default editor)\n` +
                `**Create:** "Create file.txt with content 'Hello World'"\n` +
                `**Edit:** "Edit line 10 in file.js to say 'new code'"\n` +
                `**Replace:** "Replace 'old' with 'new' in file.js"\n` +
                `**Insert:** "Insert 'new line' at line 5 in file.js"\n` +
                `**Delete:** "Delete lines 5-10 from file.js"`
        };
    }
};

export default plugin;
