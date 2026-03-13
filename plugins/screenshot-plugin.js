/**
 * Screenshot Plugin for SENTINAL
 * Screen capture and image management
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execAsync = promisify(exec);

const plugin = {
    name: 'Screenshot',
    version: '1.0.0',
    description: 'Screen capture and screenshot management',
    screenshotDir: null,

    async initialize() {
        // Create screenshots directory
        const picturesDir = path.join(os.homedir(), 'Pictures');
        this.screenshotDir = path.join(picturesDir, 'SENTINAL Screenshots');

        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }

        console.log('[SCREENSHOT] Plugin initialized');
        console.log(`[SCREENSHOT] Saving to: ${this.screenshotDir}`);
    },

    async cleanup() {
        console.log('[SCREENSHOT] Plugin cleanup');
    },

    canHandle(intent, userInput) {
        return /screenshot|screen ?shot|capture (?:screen|display)|take (?:a )?(?:picture|photo) of (?:screen|display)|snap screen/i.test(userInput);
    },

    async handle(intent, userInput, context) {
        try {
            return await this.takeScreenshot();
        } catch (error) {
            console.error('[SCREENSHOT] Error:', error.message);
            return {
                success: false,
                message: `Screenshot capture failed, Sir: ${error.message}`
            };
        }
    },

    /**
     * Take a screenshot
     */
    async takeScreenshot() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `SENTINAL_Screenshot_${timestamp}.png`;
            const filepath = path.join(this.screenshotDir, filename);

            // PowerShell script to capture screenshot
            const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save('${filepath.replace(/\\/g, '\\\\')}')
$graphics.Dispose()
$bitmap.Dispose()

Write-Output "SUCCESS"
`;

            const command = `powershell -command "${psScript.replace(/"/g, '\\"')}"`;
            const { stdout, stderr } = await execAsync(command, { timeout: 10000 });

            // Verify file was created
            if (!fs.existsSync(filepath)) {
                throw new Error('Screenshot file was not created');
            }

            const stats = fs.statSync(filepath);
            const sizeKB = Math.round(stats.size / 1024);

            const message = `Screenshot captured successfully, Sir!

📸 Filename: ${filename}
📁 Location: ${this.screenshotDir}
💾 Size: ${sizeKB} KB

The screenshot has been saved to your Pictures folder.`;

            return {
                success: true,
                message: message,
                data: {
                    filename: filename,
                    filepath: filepath,
                    size: stats.size,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Unable to capture screenshot: ${error.message}`
            };
        }
    }
};

export default plugin;
