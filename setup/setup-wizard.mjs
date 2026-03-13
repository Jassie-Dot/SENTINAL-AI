/**
 * ====================================
 * SENTINAL SETUP WIZARD - ENHANCED
 * ====================================
 * Robust auto-download and configuration:
 * - Ollama (Local LLM server)
 * - AI Models (llama3.2, llava for vision)
 * 
 * Features:
 * - Multi-method installation (direct download, winget, chocolatey)
 * - Robust download with retry logic
 * - Proper redirect handling
 * - PATH detection and configuration
 * - Detailed progress reporting
 */

import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const { app, BrowserWindow, ipcMain } = _require('electron');

import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { exec, spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    OLLAMA_DOWNLOAD_URL: 'https://ollama.com/download/OllamaSetup.exe',
    OLLAMA_MODELS: ['llama3.2'],  // Models to install
    TEMP_DIR: path.join(os.tmpdir(), 'sentinal-setup'),
    MAX_DOWNLOAD_RETRIES: 3,
    MAX_REDIRECTS: 5,
    DOWNLOAD_TIMEOUT: 300000, // 5 minutes
    INSTALL_TIMEOUT: 600000,  // 10 minutes
    CHECK_TIMEOUT: 5000,      // 5 seconds
    OLLAMA_PATHS: [
        process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs', 'Ollama', 'ollama.exe') : '',
        'C:\\Program Files\\Ollama\\ollama.exe',
        'C:\\Program Files (x86)\\Ollama\\ollama.exe',
        path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Ollama', 'ollama.exe')
    ].filter(Boolean)
};

class SetupWizard {
    constructor() {
        this.window = null;
        this.status = 'checking';
        this.progress = 0;
        this.message = 'Initializing...';
        this.ollamaPath = null;
    }

    /**
     * Log with timestamp
     */
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = level === 'error' ? '[SETUP ERROR]' : '[SETUP]';
        console.log(`${prefix} ${timestamp} - ${message}`);
    }

    /**
     * Find Ollama executable path
     */
    findOllamaPath() {
        // First check if ollama is in PATH
        try {
            const result = execSync('where ollama', { encoding: 'utf8', timeout: 5000 });
            const paths = result.trim().split('\n');
            if (paths.length > 0 && fs.existsSync(paths[0].trim())) {
                this.ollamaPath = paths[0].trim();
                this.log(`Found Ollama in PATH: ${this.ollamaPath}`);
                return this.ollamaPath;
            }
        } catch (e) {
            // Not in PATH, continue checking
        }

        // Check common installation paths
        for (const checkPath of CONFIG.OLLAMA_PATHS) {
            if (fs.existsSync(checkPath)) {
                this.ollamaPath = checkPath;
                this.log(`Found Ollama at: ${this.ollamaPath}`);
                return this.ollamaPath;
            }
        }

        return null;
    }

    /**
     * Check if Ollama is installed
     */
    async checkOllama() {
        return new Promise((resolve) => {
            // Try running ollama --version
            exec('ollama --version', { timeout: CONFIG.CHECK_TIMEOUT }, (error, stdout) => {
                if (!error && stdout) {
                    this.log(`Ollama version: ${stdout.trim()}`);
                    resolve(true);
                    return;
                }

                // Check if we can find the executable
                const ollamaPath = this.findOllamaPath();
                if (ollamaPath) {
                    exec(`"${ollamaPath}" --version`, { timeout: CONFIG.CHECK_TIMEOUT }, (err, out) => {
                        if (!err && out) {
                            this.log(`Ollama version (direct): ${out.trim()}`);
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    });
                } else {
                    resolve(false);
                }
            });
        });
    }

    /**
     * Check if Ollama server is running
     */
    async isOllamaRunning() {
        return new Promise((resolve) => {
            const req = http.get('http://localhost:11434/api/tags', { timeout: 3000 }, (res) => {
                resolve(res.statusCode === 200);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    /**
     * Check if the required models are installed
     */
    async checkModels() {
        try {
            const response = await fetch('http://localhost:11434/api/tags', {
                signal: AbortSignal.timeout(5000)
            });
            if (!response.ok) return { installed: [], missing: CONFIG.OLLAMA_MODELS };

            const data = await response.json();
            const installedModels = (data.models || []).map(m => m.name.split(':')[0]);

            const installed = CONFIG.OLLAMA_MODELS.filter(m =>
                installedModels.some(im => im.includes(m))
            );
            const missing = CONFIG.OLLAMA_MODELS.filter(m =>
                !installedModels.some(im => im.includes(m))
            );

            return { installed, missing };
        } catch (e) {
            this.log(`Error checking models: ${e.message}`, 'error');
            return { installed: [], missing: CONFIG.OLLAMA_MODELS };
        }
    }

    /**
     * Start Ollama server
     */
    async startOllama() {
        return new Promise(async (resolve) => {
            this.log('Starting Ollama server...');

            // Check if already running
            if (await this.isOllamaRunning()) {
                this.log('Ollama server already running');
                resolve(true);
                return;
            }

            // Determine the command to use
            const ollamaCmd = this.ollamaPath ? `"${this.ollamaPath}"` : 'ollama';

            try {
                const ollamaProcess = spawn(ollamaCmd, ['serve'], {
                    detached: true,
                    stdio: 'ignore',
                    shell: true,
                    windowsHide: true
                });
                ollamaProcess.unref();
                this.log('Spawned Ollama server process');
            } catch (e) {
                this.log(`Error spawning Ollama: ${e.message}`, 'error');
            }

            // Wait for server to be ready
            let attempts = 0;
            const maxAttempts = 30;
            const checkInterval = setInterval(async () => {
                attempts++;
                if (await this.isOllamaRunning()) {
                    clearInterval(checkInterval);
                    this.log('Ollama server is ready');
                    resolve(true);
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    this.log('Timeout waiting for Ollama server', 'error');
                    resolve(false);
                }
            }, 1000);
        });
    }

    /**
     * Download file with proper redirect handling and retry logic
     */
    async downloadFile(url, destPath, onProgress, retryCount = 0) {
        return new Promise((resolve, reject) => {
            this.log(`Downloading from: ${url} (attempt ${retryCount + 1})`);

            // Create temp directory if needed
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }

            const file = fs.createWriteStream(destPath);
            let redirectCount = 0;

            const makeRequest = (currentUrl) => {
                const protocol = currentUrl.startsWith('https') ? https : http;

                const req = protocol.get(currentUrl, { timeout: CONFIG.DOWNLOAD_TIMEOUT }, (response) => {
                    // Handle redirects
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        redirectCount++;
                        if (redirectCount > CONFIG.MAX_REDIRECTS) {
                            file.close();
                            fs.unlinkSync(destPath);
                            reject(new Error('Too many redirects'));
                            return;
                        }

                        let redirectUrl = response.headers.location;
                        // Handle relative redirects
                        if (!redirectUrl.startsWith('http')) {
                            const urlObj = new URL(currentUrl);
                            redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
                        }

                        this.log(`Redirect ${redirectCount}: ${redirectUrl}`);
                        makeRequest(redirectUrl);
                        return;
                    }

                    if (response.statusCode !== 200) {
                        file.close();
                        fs.unlinkSync(destPath);
                        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                        return;
                    }

                    const totalSize = parseInt(response.headers['content-length'], 10) || 0;
                    let downloadedSize = 0;

                    response.on('data', (chunk) => {
                        downloadedSize += chunk.length;
                        if (totalSize > 0 && onProgress) {
                            const percent = Math.round((downloadedSize / totalSize) * 100);
                            onProgress(percent, downloadedSize, totalSize);
                        }
                    });

                    response.pipe(file);

                    file.on('finish', () => {
                        file.close();
                        this.log(`Download complete: ${destPath} (${downloadedSize} bytes)`);
                        resolve(destPath);
                    });
                });

                req.on('error', (err) => {
                    file.close();
                    try { fs.unlinkSync(destPath); } catch { }
                    reject(err);
                });

                req.on('timeout', () => {
                    req.destroy();
                    file.close();
                    try { fs.unlinkSync(destPath); } catch { }
                    reject(new Error('Download timeout'));
                });
            };

            file.on('error', (err) => {
                file.close();
                try { fs.unlinkSync(destPath); } catch { }
                reject(err);
            });

            makeRequest(url);
        }).catch(async (error) => {
            // Retry logic
            if (retryCount < CONFIG.MAX_DOWNLOAD_RETRIES - 1) {
                this.log(`Download failed: ${error.message}. Retrying...`);
                await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds before retry
                return this.downloadFile(url, destPath, onProgress, retryCount + 1);
            }
            throw error;
        });
    }

    /**
     * Download Ollama installer
     */
    async downloadOllama(onProgress) {
        const installerPath = path.join(CONFIG.TEMP_DIR, 'OllamaSetup.exe');

        // Clean up existing file
        try { fs.unlinkSync(installerPath); } catch { }

        return this.downloadFile(
            CONFIG.OLLAMA_DOWNLOAD_URL,
            installerPath,
            onProgress
        );
    }

    /**
     * Try installing Ollama using winget
     */
    async installWithWinget(onStatusChange) {
        return new Promise((resolve) => {
            this.log('Attempting installation via winget...');
            onStatusChange?.('installing', 10, 'Installing Ollama via Windows Package Manager...');

            exec('winget install Ollama.Ollama --accept-source-agreements --accept-package-agreements',
                { timeout: CONFIG.INSTALL_TIMEOUT },
                (error, stdout, stderr) => {
                    if (error) {
                        this.log(`Winget installation failed: ${error.message}`, 'error');
                        resolve(false);
                    } else {
                        this.log('Winget installation completed');
                        resolve(true);
                    }
                }
            );
        });
    }

    /**
     * Check if winget is available
     */
    async isWingetAvailable() {
        return new Promise((resolve) => {
            exec('winget --version', { timeout: 5000 }, (error) => {
                resolve(!error);
            });
        });
    }

    /**
     * Install Ollama from downloaded installer
     */
    async installOllama(installerPath, onStatusChange) {
        return new Promise((resolve, reject) => {
            this.log(`Installing from: ${installerPath}`);
            onStatusChange?.('installing', 50, 'Installing Ollama (this may take a few minutes)...');

            // First try silent installation
            exec(`"${installerPath}" /S /ALLUSERS`, { timeout: CONFIG.INSTALL_TIMEOUT }, async (error) => {
                if (error) {
                    this.log(`Silent install failed, trying regular install: ${error.message}`);

                    // Try without silent flag
                    exec(`"${installerPath}"`, { timeout: CONFIG.INSTALL_TIMEOUT }, async (err2) => {
                        if (err2) {
                            this.log(`Direct install failed: ${err2.message}`, 'error');

                            // Last resort: try winget
                            if (await this.isWingetAvailable()) {
                                const wingetSuccess = await this.installWithWinget(onStatusChange);
                                if (wingetSuccess) {
                                    resolve(true);
                                } else {
                                    reject(new Error('All installation methods failed'));
                                }
                            } else {
                                reject(new Error('Installation failed'));
                            }
                        } else {
                            this.log('Installer completed');
                            resolve(true);
                        }
                    });
                } else {
                    this.log('Silent installation completed');
                    resolve(true);
                }
            });
        });
    }

    /**
     * Pull a model with progress tracking
     */
    async pullModel(modelName, onProgress) {
        return new Promise((resolve, reject) => {
            this.log(`Pulling model: ${modelName}`);

            const ollamaCmd = this.ollamaPath ? `"${this.ollamaPath}"` : 'ollama';

            const pullProcess = spawn(ollamaCmd, ['pull', modelName], {
                shell: true,
                windowsHide: true
            });

            let lastProgress = 0;

            const parseProgress = (data) => {
                const output = data.toString();
                // Parse various progress formats from Ollama
                const percentMatch = output.match(/(\d+)%/);
                if (percentMatch) {
                    lastProgress = parseInt(percentMatch[1], 10);
                    onProgress?.(lastProgress);
                }

                // Parse status messages
                if (output.includes('pulling')) {
                    onProgress?.(lastProgress || 10);
                } else if (output.includes('verifying')) {
                    onProgress?.(95);
                } else if (output.includes('success')) {
                    onProgress?.(100);
                }
            };

            pullProcess.stdout.on('data', parseProgress);
            pullProcess.stderr.on('data', parseProgress);

            pullProcess.on('close', (code) => {
                if (code === 0) {
                    this.log(`Model ${modelName} pulled successfully`);
                    resolve(true);
                } else {
                    this.log(`Model pull failed with code ${code}`, 'error');
                    reject(new Error(`Model pull failed with code ${code}`));
                }
            });

            pullProcess.on('error', (err) => {
                this.log(`Model pull error: ${err.message}`, 'error');
                reject(err);
            });
        });
    }

    /**
     * Pull all required models
     */
    async pullModels(onStatusChange) {
        const { missing } = await this.checkModels();

        if (missing.length === 0) {
            this.log('All required models already installed');
            return true;
        }

        this.log(`Models to install: ${missing.join(', ')}`);

        for (let i = 0; i < missing.length; i++) {
            const model = missing[i];
            const baseProgress = Math.round((i / missing.length) * 100);

            onStatusChange?.(
                'pulling',
                baseProgress,
                `Downloading AI model: ${model} (${i + 1}/${missing.length})...`
            );

            try {
                await this.pullModel(model, (progress) => {
                    const overallProgress = baseProgress + Math.round((progress / missing.length));
                    onStatusChange?.(
                        'pulling',
                        Math.min(overallProgress, 99),
                        `Downloading AI model: ${model} - ${progress}%`
                    );
                });
            } catch (error) {
                this.log(`Failed to pull model ${model}: ${error.message}`, 'error');
                // Continue with other models instead of failing completely
            }
        }

        return true;
    }

    /**
     * Run the complete setup process
     */
    async runSetup(onStatusChange) {
        try {
            // Step 1: Check if Ollama is installed
            onStatusChange?.('checking', 0, 'Checking for Ollama installation...');
            this.log('Starting setup process...');

            let ollamaInstalled = await this.checkOllama();

            if (!ollamaInstalled) {
                this.log('Ollama not found, starting installation...');

                // Try winget first (cleaner installation)
                if (await this.isWingetAvailable()) {
                    onStatusChange?.('installing', 5, 'Installing Ollama via Windows Package Manager...');
                    const wingetSuccess = await this.installWithWinget(onStatusChange);

                    if (wingetSuccess) {
                        // Wait for installation to complete and Ollama to be available
                        await new Promise(r => setTimeout(r, 5000));
                        ollamaInstalled = await this.checkOllama();
                    }
                }

                // If winget failed or not available, download installer
                if (!ollamaInstalled) {
                    onStatusChange?.('downloading', 0, 'Downloading Ollama installer...');

                    try {
                        const installerPath = await this.downloadOllama((percent, downloaded, total) => {
                            const mb = (downloaded / (1024 * 1024)).toFixed(1);
                            const totalMb = (total / (1024 * 1024)).toFixed(1);
                            onStatusChange?.(
                                'downloading',
                                percent,
                                `Downloading Ollama... ${percent}% (${mb}/${totalMb} MB)`
                            );
                        });

                        onStatusChange?.('installing', 0, 'Installing Ollama...');
                        await this.installOllama(installerPath, onStatusChange);

                        // Clean up installer
                        try { fs.unlinkSync(installerPath); } catch { }

                        // Wait for installation to be fully complete
                        await new Promise(r => setTimeout(r, 5000));

                        // Find the installed Ollama
                        this.findOllamaPath();

                    } catch (downloadError) {
                        this.log(`Download/install failed: ${downloadError.message}`, 'error');
                        throw new Error(`Failed to install Ollama: ${downloadError.message}`);
                    }
                }
            }

            // Step 2: Start Ollama server
            onStatusChange?.('starting', 0, 'Starting Ollama server...');

            const serverStarted = await this.startOllama();
            if (!serverStarted) {
                throw new Error('Failed to start Ollama server. Please try restarting your computer and running SENTINAL again.');
            }

            // Wait for server to stabilize
            await new Promise(r => setTimeout(r, 2000));

            // Step 3: Pull required models
            onStatusChange?.('checking-model', 0, 'Checking AI models...');
            await this.pullModels(onStatusChange);

            // Step 4: Final verification
            onStatusChange?.('verifying', 95, 'Verifying AI connection...');
            await new Promise(r => setTimeout(r, 2000));

            const { installed, missing } = await this.checkModels();

            if (installed.length === 0) {
                throw new Error('No AI models available. Please check your internet connection and try again.');
            }

            if (missing.length > 0) {
                this.log(`Warning: Some models failed to install: ${missing.join(', ')}`);
            }

            onStatusChange?.('complete', 100, 'Setup complete! Starting SENTINAL...');
            this.log('Setup completed successfully');
            return true;

        } catch (error) {
            this.log(`Setup failed: ${error.message}`, 'error');
            onStatusChange?.('error', 0, `Setup failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Quick check if setup is needed
     */
    async isSetupNeeded() {
        // Check if Ollama is installed
        const ollamaInstalled = await this.checkOllama();
        if (!ollamaInstalled) {
            this.log('Setup needed: Ollama not installed');
            return true;
        }

        // Try to start Ollama if not running
        const isRunning = await this.isOllamaRunning();
        if (!isRunning) {
            const started = await this.startOllama();
            if (!started) {
                this.log('Setup needed: Cannot start Ollama');
                return true;
            }
            await new Promise(r => setTimeout(r, 2000));
        }

        // Check for models
        const { missing } = await this.checkModels();
        if (missing.length > 0) {
            this.log(`Setup needed: Missing models: ${missing.join(', ')}`);
            return true;
        }

        this.log('Setup not needed: All dependencies ready');
        return false;
    }
}

export default SetupWizard;
