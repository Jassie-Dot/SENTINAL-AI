import fetch from 'node-fetch';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const plugin = {
    name: 'open-app',
    version: '2.0.0',
    installedApps: new Map(),

    async initialize() {
        console.log('[PLUGIN] open-app loaded');
        this.loadCustomApps();
        await this.loadInstalledApps();
    },

    loadCustomApps() {
        try {
            const customAppsPath = path.join(process.cwd(), 'data', 'apps.json');
            if (fs.existsSync(customAppsPath)) {
                const data = JSON.parse(fs.readFileSync(customAppsPath, 'utf8'));
                if (Array.isArray(data)) {
                    data.forEach(app => {
                        if (app.title && app.command) {
                            this.installedApps.set(app.title.toLowerCase(), app.command);
                        }
                    });
                    console.log(`[OPEN-APP] Loaded ${data.length} custom apps from data/apps.json.`);
                }
            }
        } catch (e) {
            console.error('[OPEN-APP] Failed to load custom apps:', e.message);
        }
    },

    async loadInstalledApps() {
        try {
            console.log('[OPEN-APP] Indexing installed apps...');
            const cacheFile = 'apps_cache.json';
            // Use Out-File to avoid stdout buffer limits and encoding issues
            await execAsync(`powershell -Command "Get-StartApps | ConvertTo-Json | Out-File -Encoding utf8 ${cacheFile}"`);

            if (fs.existsSync(cacheFile)) {
                const fileContent = fs.readFileSync(cacheFile, 'utf8');
                let apps = [];
                try {
                    apps = JSON.parse(fileContent);
                } catch (e) {
                    // Sometimes PowerShell adds BOM or other chars
                    apps = JSON.parse(fileContent.trim());
                }

                // Normalize and store
                if (Array.isArray(apps)) {
                    apps.forEach(app => {
                        if (app.Name && app.AppID) {
                            this.installedApps.set(app.Name.toLowerCase(), app.AppID);
                        }
                    });
                }

                // Clean up
                fs.unlinkSync(cacheFile);
            }

            console.log(`[OPEN-APP] Indexed ${this.installedApps.size} apps.`);
        } catch (error) {
            console.error('[OPEN-APP] Failed to index apps:', error.message);
        }
    },

    canHandle(intent, text) {
        return /open|app|launch|start|run/i.test(text) || /open|app|launch|start|run/i.test(intent);
    },

    async handle(intent, text, context) {
        // Extract app name
        let appName = text.toLowerCase()
            .replace(/^(open|launch|start|run)\s+/, '')
            .trim();

        // Handle "open [app]" or just "[app]"
        if (!appName) {
            const match = text.match(/(?:open|launch|start|run)\s+(.+)/i);
            if (match) appName = match[1].toLowerCase().trim();
        }

        if (!appName) {
            return { success: false, message: "Please specify which app to open." };
        }

        // 1. Check Static Map (Fastest) with some common overrides
        const staticMap = {
            'notepad': 'notepad',
            'calculator': 'calc',
            'calc': 'calc',
            'cmd': 'cmd',
            'terminal': 'wt',
            'explorer': 'explorer',
            'task manager': 'taskmgr',
            'control panel': 'control',
            'settings': 'start ms-settings:',
        };

        if (staticMap[appName]) {
            try {
                // Use PowerShell Start-Process for better detachment
                const cmd = `powershell -c "Start-Process '${staticMap[appName]}'"`;
                await execAsync(cmd);
                return { success: true, message: `Opened ${appName}.`, data: { app: appName } };
            } catch (e) {
                console.error(`[OPEN-APP] Static map launch failed: ${e.message}`);
                // Fallthrough
            }
        }

        // 2. Fuzzy Search in Installed Apps
        let bestMatch = null;
        let highestScore = 0;

        for (const [name, appId] of this.installedApps.entries()) {
            if (name === appName) {
                bestMatch = { name, appId };
                break; // Exact match
            }
            if (name.includes(appName)) {
                // Simple containment check is a good heuristic
                const score = appName.length / name.length;
                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = { name, appId };
                }
            }
        }

        if (bestMatch) {
            try {
                console.log(`[OPEN-APP] Launching ${bestMatch.name} (${bestMatch.appId})`);
                
                // If it's a command (no !App and doesn't look like an AppID) or explicitly from custom apps
                if (bestMatch.appId.includes(' ') || !bestMatch.appId.includes('!')) {
                     await execAsync(`powershell -c "Start-Process '${bestMatch.appId}'"`);
                } else {
                     await execAsync(`explorer "shell:AppsFolder\\${bestMatch.appId}"`);
                }
                
                return { success: true, message: `Opening ${bestMatch.name}...`, data: { app: bestMatch.name } };
            } catch (error) {
                // Fallback to direct execution
                try {
                    await execAsync(`powershell -c "Start-Process '${bestMatch.appId}'"`);
                    return { success: true, message: `Opening ${bestMatch.name}...`, data: { app: bestMatch.name } };
                } catch (e) {
                    return { success: false, message: `Failed to launch ${bestMatch.name}.`, error: error.message };
                }
            }
        }

        // 3. Fallback: Try straight execution using Start-Process
        try {
            // "Start-Process" handles paths and detachments better than "start"
            await execAsync(`powershell -c "Start-Process '${appName}'"`);
            return { success: true, message: `Attempting to launch ${appName}...`, data: { app: appName } };
        } catch (error) {
            return {
                success: false,
                message: `I couldn't find an app named "${appName}".`,
                error: error.message
            };
        }
    }
};

export default plugin;