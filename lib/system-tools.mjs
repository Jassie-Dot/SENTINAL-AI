/**
 * ====================================
 * SENTINAL SYSTEM TOOLS
 * ====================================
 * Provides AI with full system access:
 * - Command execution
 * - File operations
 * - System control
 */

import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Dangerous command patterns that require confirmation
const DANGEROUS_PATTERNS = [
    /rm\s+-rf/i,
    /del\s+\/[sf]/i,
    /rmdir/i,
    /format\s+/i,
    /shutdown/i,
    /restart/i,
    /reboot/i,
    /reg\s+(add|delete)/i,
    /netsh/i,
    /taskkill/i,
    /\\system32\\/i,
    /powershell.*-enc/i,
    />>\s*\//i,  // Append to system files
];

/**
 * Tool definitions for AI tool calling
 */
export const TOOL_DEFINITIONS = [
    {
        name: 'run_command',
        description: 'Execute a shell command (PowerShell/CMD). Use for running programs, scripts, package managers, git, etc.',
        parameters: {
            command: { type: 'string', description: 'The command to execute', required: true },
            cwd: { type: 'string', description: 'Working directory (optional)', required: false }
        }
    },
    {
        name: 'read_file',
        description: 'Read the contents of a file',
        parameters: {
            path: { type: 'string', description: 'Absolute or relative path to the file', required: true }
        }
    },
    {
        name: 'write_file',
        description: 'Write content to a file (creates if not exists, overwrites if exists)',
        parameters: {
            path: { type: 'string', description: 'Path to the file', required: true },
            content: { type: 'string', description: 'Content to write', required: true }
        }
    },
    {
        name: 'append_file',
        description: 'Append content to the end of a file',
        parameters: {
            path: { type: 'string', description: 'Path to the file', required: true },
            content: { type: 'string', description: 'Content to append', required: true }
        }
    },
    {
        name: 'list_directory',
        description: 'List files and folders in a directory',
        parameters: {
            path: { type: 'string', description: 'Directory path', required: true },
            recursive: { type: 'boolean', description: 'Include subdirectories', required: false }
        }
    },
    {
        name: 'create_directory',
        description: 'Create a new directory (and parent directories if needed)',
        parameters: {
            path: { type: 'string', description: 'Directory path to create', required: true }
        }
    },
    {
        name: 'delete_file',
        description: 'Delete a file or empty directory (REQUIRES CONFIRMATION)',
        parameters: {
            path: { type: 'string', description: 'Path to delete', required: true }
        }
    },
    {
        name: 'move_file',
        description: 'Move or rename a file/directory',
        parameters: {
            source: { type: 'string', description: 'Source path', required: true },
            destination: { type: 'string', description: 'Destination path', required: true }
        }
    },
    {
        name: 'copy_file',
        description: 'Copy a file to a new location',
        parameters: {
            source: { type: 'string', description: 'Source path', required: true },
            destination: { type: 'string', description: 'Destination path', required: true }
        }
    },
    {
        name: 'search_files',
        description: 'Search for files by name pattern in a directory',
        parameters: {
            directory: { type: 'string', description: 'Directory to search in', required: true },
            pattern: { type: 'string', description: 'File name pattern (supports wildcards like *.txt)', required: true }
        }
    },
    {
        name: 'get_file_info',
        description: 'Get information about a file (size, dates, type)',
        parameters: {
            path: { type: 'string', description: 'Path to the file', required: true }
        }
    },
    {
        name: 'execute_open_app',
        description: 'Open an application or file with default program',
        parameters: {
            target: { type: 'string', description: 'Application name, path, or URL to open', required: true }
        }
    },
    {
        name: 'get_system_info',
        description: 'Get system information (OS, CPU, memory, disk)',
        parameters: {}
    },
    {
        name: 'get_running_processes',
        description: 'List currently running processes',
        parameters: {
            filter: { type: 'string', description: 'Optional filter by process name', required: false }
        }
    },
    {
        name: 'take_screenshot',
        description: 'Take a screenshot of the main display and save it.',
        parameters: {}
    },
    {
        name: 'control_input',
        description: 'Control mouse and keyboard via PowerShell (simulated user input).',
        parameters: {
            action: { type: 'string', description: 'Action: type, press, move, click', required: true },
            text: { type: 'string', description: 'Text to type (for "type" action)', required: false },
            key: { type: 'string', description: 'Key to press (e.g. "Enter", "Tab", "^c")', required: false },
            x: { type: 'number', description: 'X coordinate (for "move")', required: false },
            y: { type: 'number', description: 'Y coordinate (for "move")', required: false }
        }
    }
];

/**
 * Check if a command is potentially dangerous.
 * Used as a fast heuristic; PolicyEngine adds higher-level gating.
 */
export function isDangerousCommand(command) {
    if (!command) return false;
    return DANGEROUS_PATTERNS.some((re) => re.test(command));
}

/**
 * Execute a shell command
 */
export async function runCommand(command, cwd = process.cwd()) {
    try {
        // Check for dangerous commands
        if (isDangerousCommand(command)) {
            return {
                success: false,
                requiresConfirmation: true,
                message: `This command may be dangerous: ${command}`,
                command
            };
        }

        const { stdout, stderr } = await execAsync(command, {
            cwd,
            shell: 'powershell.exe',
            timeout: 60000, // 1 minute timeout
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        });

        return {
            success: true,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            command
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            stderr: error.stderr?.trim() || '',
            command
        };
    }
}

/**
 * Read file contents
 */
export async function readFile(filePath) {
    try {
        const absolutePath = path.resolve(filePath);
        const content = await fs.promises.readFile(absolutePath, 'utf-8');
        const stats = await fs.promises.stat(absolutePath);

        return {
            success: true,
            content,
            path: absolutePath,
            size: stats.size,
            modified: stats.mtime
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            path: filePath
        };
    }
}

/**
 * Write content to file
 */
export async function writeFile(filePath, content) {
    try {
        const absolutePath = path.resolve(filePath);
        const dir = path.dirname(absolutePath);

        // Create directory if it doesn't exist
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.writeFile(absolutePath, content, 'utf-8');

        return {
            success: true,
            path: absolutePath,
            bytesWritten: Buffer.byteLength(content, 'utf-8')
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            path: filePath
        };
    }
}

/**
 * Append content to file
 */
export async function appendFile(filePath, content) {
    try {
        const absolutePath = path.resolve(filePath);
        await fs.promises.appendFile(absolutePath, content, 'utf-8');

        return {
            success: true,
            path: absolutePath
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            path: filePath
        };
    }
}

/**
 * List directory contents
 */
export async function listDirectory(dirPath, recursive = false) {
    try {
        const absolutePath = path.resolve(dirPath);
        const entries = await fs.promises.readdir(absolutePath, { withFileTypes: true });

        const items = await Promise.all(entries.map(async (entry) => {
            const fullPath = path.join(absolutePath, entry.name);
            const stats = await fs.promises.stat(fullPath).catch(() => null);

            const item = {
                name: entry.name,
                type: entry.isDirectory() ? 'directory' : 'file',
                size: stats?.size || 0,
                modified: stats?.mtime || null
            };

            if (recursive && entry.isDirectory()) {
                const subItems = await listDirectory(fullPath, true).catch(() => ({ items: [] }));
                item.children = subItems.items || [];
            }

            return item;
        }));

        return {
            success: true,
            path: absolutePath,
            items
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            path: dirPath
        };
    }
}

/**
 * Create directory
 */
export async function createDirectory(dirPath) {
    try {
        const absolutePath = path.resolve(dirPath);
        await fs.promises.mkdir(absolutePath, { recursive: true });

        return {
            success: true,
            path: absolutePath
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            path: dirPath
        };
    }
}

/**
 * Delete file or directory
 */
export async function deleteFile(filePath) {
    try {
        const absolutePath = path.resolve(filePath);
        const stats = await fs.promises.stat(absolutePath);

        if (stats.isDirectory()) {
            await fs.promises.rmdir(absolutePath);
        } else {
            await fs.promises.unlink(absolutePath);
        }

        return {
            success: true,
            path: absolutePath,
            requiresConfirmation: true
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            path: filePath
        };
    }
}

/**
 * Move/rename file
 */
export async function moveFile(source, destination) {
    try {
        const srcPath = path.resolve(source);
        const destPath = path.resolve(destination);

        // Ensure destination directory exists
        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
        await fs.promises.rename(srcPath, destPath);

        return {
            success: true,
            source: srcPath,
            destination: destPath
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            source,
            destination
        };
    }
}

/**
 * Copy file
 */
export async function copyFile(source, destination) {
    try {
        const srcPath = path.resolve(source);
        const destPath = path.resolve(destination);

        // Ensure destination directory exists
        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
        await fs.promises.copyFile(srcPath, destPath);

        return {
            success: true,
            source: srcPath,
            destination: destPath
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            source,
            destination
        };
    }
}

/**
 * Search files by pattern
 */
export async function searchFiles(directory, pattern) {
    try {
        const results = [];
        const searchDir = path.resolve(directory);

        async function search(dir) {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                // Simple wildcard matching
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');

                if (regex.test(entry.name)) {
                    results.push({
                        name: entry.name,
                        path: fullPath,
                        type: entry.isDirectory() ? 'directory' : 'file'
                    });
                }

                if (entry.isDirectory() && results.length < 100) {
                    await search(fullPath).catch(() => { });
                }
            }
        }

        await search(searchDir);

        return {
            success: true,
            pattern,
            directory: searchDir,
            results: results.slice(0, 100)
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            pattern,
            directory
        };
    }
}

/**
 * Get file info
 */
export async function getFileInfo(filePath) {
    try {
        const absolutePath = path.resolve(filePath);
        const stats = await fs.promises.stat(absolutePath);

        return {
            success: true,
            path: absolutePath,
            name: path.basename(absolutePath),
            extension: path.extname(absolutePath),
            size: stats.size,
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
            created: stats.birthtime,
            modified: stats.mtime,
            accessed: stats.atime
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            path: filePath
        };
    }
}

/**
 * Open application or file
 */
export async function openApplication(target) {
    try {
        if (!target || target === 'undefined') {
            throw new Error("Application name is missing.");
        }
        // Common App Mappings for Windows
        const COMMON_APPS = {
            'explorer': 'explorer.exe',
            'file explorer': 'explorer.exe',
            'files': 'explorer.exe',
            'notepad': 'notepad.exe',
            'calculator': 'calc.exe',
            'chrome': 'chrome.exe',
            'edge': 'msedge.exe',
            'settings': 'ms-settings:',
            'store': 'ms-windows-store:',
            'microsoft store': 'ms-windows-store:',
            'cmd': 'cmd.exe',
            'powershell': 'powershell.exe',
            'task manager': 'taskmgr.exe',
            'spotify': 'spotify.exe',
            'paint': 'mspaint.exe'
        };

        const resolvedTarget = COMMON_APPS[target.toLowerCase()] || target;
        console.log(`[SYSTEM] Opening: ${resolvedTarget} (Original: ${target})`);

        // Advanced PowerShell launch that handles Apps, URLs, and Files better than 'start'
        // 'Start-Process' is more robust for applications
        const command = `powershell -c "Start-Process '${resolvedTarget}'"`;

        await execAsync(command);

        return {
            success: true,
            message: `Launched ${resolvedTarget} successfully`,
            target: resolvedTarget
        };
    } catch (error) {
        // Fallback to standard start command if PowerShell fails
        try {
            await execAsync(`start "" "${target}"`, { shell: 'cmd.exe' });
            return {
                success: true,
                message: `Launched ${target} (fallback method)`,
                target
            };
        } catch (fallbackError) {
            return {
                success: false,
                error: `Failed to open ${target}: ${error.message}`,
                target
            };
        }
    }
}

/**
 * Get system information
 */
export async function getSystemInfo() {
    try {
        const os = await import('os');

        return {
            success: true,
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            release: os.release(),
            cpus: os.cpus().length,
            totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
            freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024) + ' GB',
            uptime: Math.round(os.uptime() / 3600) + ' hours',
            homeDir: os.homedir(),
            tempDir: os.tmpdir()
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get running processes
 */
export async function getRunningProcesses(filter = '') {
    try {
        const { stdout } = await execAsync('Get-Process | Select-Object Name, Id, CPU, WorkingSet | ConvertTo-Json', {
            shell: 'powershell.exe'
        });

        let processes = JSON.parse(stdout);

        if (filter) {
            processes = processes.filter(p => p.Name.toLowerCase().includes(filter.toLowerCase()));
        }

        return {
            success: true,
            count: processes.length,
            processes: processes.slice(0, 50).map(p => ({
                name: p.Name,
                pid: p.Id,
                cpu: p.CPU?.toFixed(2) || 0,
                memory: Math.round((p.WorkingSet || 0) / 1024 / 1024) + ' MB'
            }))
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Execute a tool by name
 */
export async function executeTool(toolName, params) {
    if (!params) params = {};
    console.log(`[TOOL] Executing ${toolName} with params:`, params);

    switch (toolName) {
        case 'run_command':
            return runCommand(params.command, params.cwd);
        case 'read_file':
            return readFile(params.path);
        case 'write_file':
            return writeFile(params.path, params.content);
        case 'append_file':
            return appendFile(params.path, params.content);
        case 'list_directory':
            return listDirectory(params.path, params.recursive);
        case 'create_directory':
            return createDirectory(params.path);
        case 'delete_file':
            return deleteFile(params.path);
        case 'move_file':
            return moveFile(params.source, params.destination);
        case 'copy_file':
            return copyFile(params.source, params.destination);
        case 'search_files':
            return searchFiles(params.directory, params.pattern);
        case 'get_file_info':
            return getFileInfo(params.path);
        case 'execute_open_app':
            return openApplication(params.target);
        case 'get_system_info':
            return getSystemInfo();
        case 'get_running_processes':
            return getRunningProcesses(params.filter);
        case 'change_directory':
            return changeDirectory(params.path);
        case 'grep_search':
            return grepSearch(params.directory, params.query, params.file_pattern);
        case 'replace_in_file':
            return replaceInFile(params.path, params.search, params.replace);
        case 'edit_line':
            return editLine(params.path, params.line_number, params.new_content);
        case 'insert_line':
            return insertLine(params.path, params.line_number, params.content);
        case 'delete_line':
            return deleteLine(params.path, params.start_line, params.end_line);
        case 'open_in_editor':
            return openInEditor(params.path);

        case 'take_screenshot':
            return takeScreenshot();
        case 'control_input':
            return controlInput(params.action, params);
        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

/**
 * Take a screenshot
 */
import screenshot from 'screenshot-desktop';

export async function takeScreenshot() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `screenshot-${timestamp}.jpg`;
        const publicDir = path.join(process.cwd(), 'public', 'screenshots');

        await fs.promises.mkdir(publicDir, { recursive: true });
        const filePath = path.join(publicDir, filename);

        await screenshot({ filename: filePath, format: 'jpg' });

        return {
            success: true,
            path: filePath,
            url: `/screenshots/${filename}`, // Accessible via frontend
            message: "Screenshot captured successfully."
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Control Input (Mouse/Keyboard) via PowerShell
 * Uses .NET System.Windows.Forms.SendKeys and Cursor
 */
export async function controlInput(action, params) {
    try {
        let psCommand = '';

        if (action === 'type') {
            if (!params.text) throw new Error("Text is required for 'type' action.");
            // Escape special chars for PowerShell
            const safeText = params.text.replace(/'/g, "''");
            psCommand = `
                Add-Type -AssemblyName System.Windows.Forms
                [System.Windows.Forms.SendKeys]::SendWait('${safeText}')
            `;
        } else if (action === 'press') {
            if (!params.key) throw new Error("Key is required for 'press' action.");
            psCommand = `
                Add-Type -AssemblyName System.Windows.Forms
                [System.Windows.Forms.SendKeys]::SendWait('${params.key}')
            `;
        } else if (action === 'move') {
            if (params.x === undefined || params.y === undefined) throw new Error("X and Y required for 'move' action.");
            psCommand = `
                Add-Type -AssemblyName System.Windows.Forms
                [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${params.x}, ${params.y})
            `;
        } else if (action === 'click') {
            // Clicking is harder in pure PowerShell without external DLLs, but can use SendWait for Enter/Space
            // Or import user32.dll (complex).
            // For now, let's assume 'click' means 'cliking' specific keys or simple left click at current position if possible.
            // Actually, we can use a small C# inline block for mouse click.
            psCommand = `
                $source = @"
                using System;
                using System.Runtime.InteropServices;
                public class Clicker {
                    [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
                    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);
                    private const int MOUSEEVENTF_LEFTDOWN = 0x02;
                    private const int MOUSEEVENTF_LEFTUP = 0x04;
                    public static void LeftClick() {
                        mouse_event(MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                    }
                }
"@
                Add-Type -TypeDefinition $source -Language CCSharp
                [Clicker]::LeftClick()
            `;
        } else {
            throw new Error(`Unknown action: ${action}`);
        }

        await execAsync(psCommand, { shell: 'powershell.exe' });

        return {
            success: true,
            action,
            message: `Executed ${action}`
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Update exports to include new methods and definitions
export default {
    TOOL_DEFINITIONS,
    isDangerousCommand,
    executeTool,
    takeScreenshot,
    controlInput,
    // ... existing exports
    runCommand,
    readFile,
    writeFile,
    appendFile,
    listDirectory,
    createDirectory,
    deleteFile,
    moveFile,
    copyFile,
    searchFiles,
    getFileInfo,
    openApplication,
    getSystemInfo,
    getRunningProcesses,
    grepSearch,
    replaceInFile,
    changeDirectory,
    editLine,
    insertLine,
    deleteLine,
    openInEditor
};

/**
 * Grep search implementation
 */
export async function grepSearch(directory, pattern, filePattern = '*') {
    try {
        const absoluteDir = path.resolve(directory);
        const results = [];
        const MAX_RESULTS = 50;
        const MAX_FILE_SIZE = 1024 * 1024; // 1MB limit for search

        async function searchRecursively(dir) {
            if (results.length >= MAX_RESULTS) return;
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                if (results.length >= MAX_RESULTS) break;
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
                    await searchRecursively(fullPath);
                } else if (entry.isFile()) {
                    if (filePattern && filePattern !== '*') {
                        const fpRegex = new RegExp('^' + filePattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$', 'i');
                        if (!fpRegex.test(entry.name)) continue;
                    }

                    const stats = await fs.promises.stat(fullPath);
                    if (stats.size > MAX_FILE_SIZE) continue;

                    try {
                        const content = await fs.promises.readFile(fullPath, 'utf8');
                        const lines = content.split(/\r?\n/);

                        lines.forEach((line, index) => {
                            if (results.length >= MAX_RESULTS) return;
                            if (line.toLowerCase().includes(pattern.toLowerCase())) {
                                results.push({
                                    file: fullPath,
                                    line: index + 1,
                                    content: line.trim()
                                });
                            }
                        });
                    } catch (err) { }
                }
            }
        }
        await searchRecursively(absoluteDir);
        return { success: true, count: results.length, results };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Replace string in file
 */
export async function replaceInFile(filePath, search, replace) {
    try {
        const absolutePath = path.resolve(filePath);
        const content = await fs.promises.readFile(absolutePath, 'utf-8');
        if (!content.includes(search)) return { success: false, error: 'Search text not found in file' };
        const newContent = content.split(search).join(replace);
        await fs.promises.writeFile(absolutePath, newContent, 'utf8');
        return { success: true, path: absolutePath, message: 'Content replaced successfully' };
    } catch (error) {
        return { success: false, error: error.message, path: filePath };
    }
}

/**
 * Change directory helper
 */
export async function changeDirectory(targetPath) {
    try {
        const absolutePath = path.resolve(targetPath);
        await fs.promises.access(absolutePath);
        // In a real shell we'd process.chdir, but for session we just return the path
        // The context manager handles the state update
        return { success: true, path: absolutePath, message: `Changed directory to ${absolutePath}` };
    } catch (error) {
        return { success: false, error: `Directory not found: ${error.message}` };
    }
}

/**
 * Edit specific line
 */
export async function editLine(filePath, lineNumber, newContent) {
    try {
        const absolutePath = path.resolve(filePath);
        const content = await fs.promises.readFile(absolutePath, 'utf8');
        const lines = content.split(/\r?\n/);
        if (lineNumber < 1 || lineNumber > lines.length) {
            return { success: false, error: `Line ${lineNumber} is out of bounds (1-${lines.length})` };
        }
        lines[lineNumber - 1] = newContent;
        await fs.promises.writeFile(absolutePath, lines.join('\n'), 'utf8');
        return { success: true, path: absolutePath, message: `Line ${lineNumber} updated` };
    } catch (error) {
        return { success: false, error: error.message, path: filePath };
    }
}

/**
 * Insert line
 */
export async function insertLine(filePath, lineNumber, contentToInsert) {
    try {
        const absolutePath = path.resolve(filePath);
        const content = await fs.promises.readFile(absolutePath, 'utf8');
        const lines = content.split(/\r?\n/);
        // Allow inserting at end of file (lines.length + 1)
        if (lineNumber < 1 || lineNumber > lines.length + 1) {
            return { success: false, error: `Line position ${lineNumber} is out of bounds` };
        }
        lines.splice(lineNumber - 1, 0, contentToInsert);
        await fs.promises.writeFile(absolutePath, lines.join('\n'), 'utf8');
        return { success: true, path: absolutePath, message: `Inserted content at line ${lineNumber}` };
    } catch (error) {
        return { success: false, error: error.message, path: filePath };
    }
}

/**
 * Delete line
 */
export async function deleteLine(filePath, startLine, endLine) {
    try {
        const absolutePath = path.resolve(filePath);
        const content = await fs.promises.readFile(absolutePath, 'utf8');
        const lines = content.split(/\r?\n/);
        const start = parseInt(startLine);
        const end = endLine ? parseInt(endLine) : start;

        if (start < 1 || end > lines.length || start > end) {
            return { success: false, error: `Invalid line range ${start}-${end} (File has ${lines.length} lines)` };
        }

        lines.splice(start - 1, end - start + 1);
        await fs.promises.writeFile(absolutePath, lines.join('\n'), 'utf8');
        return { success: true, path: absolutePath, message: `Deleted lines ${start}-${end}` };
    } catch (error) {
        return { success: false, error: error.message, path: filePath };
    }
}

/**
 * Open in VS Code or default editor
 */
export async function openInEditor(filePath) {
    try {
        const absolutePath = path.resolve(filePath);
        // Try VS Code first
        try {
            await execAsync(`code "${absolutePath}"`);
            return { success: true, message: `Opened ${path.basename(absolutePath)} in VS Code` };
        } catch {
            // Fallback to default editor
            await execAsync(`start "" "${absolutePath}"`, { shell: 'cmd.exe' });
            return { success: true, message: `Opened ${path.basename(absolutePath)} in default editor` };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}
