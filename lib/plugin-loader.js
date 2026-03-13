/**
 * Plugin Loader & Management System
 * Enables hot-reloadable, extensible plugin architecture for SENTINAL
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import EventEmitter from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PluginLoader extends EventEmitter {
    constructor(pluginDir) {
        super();
        this.pluginDir = pluginDir || path.join(process.cwd(), 'plugins');
        this.plugins = new Map();
        this.pluginConfigs = new Map();
    }

    /**
     * Initialize plugin system and load all plugins
     */
    async initialize() {
        console.log('[PLUGIN] Initializing plugin system...');

        // Create plugins directory if it doesn't exist
        if (!fs.existsSync(this.pluginDir)) {
            fs.mkdirSync(this.pluginDir, { recursive: true });
            console.log(`[PLUGIN] Created plugin directory: ${this.pluginDir}`);
        }

        await this.loadAllPlugins();
        console.log(`[PLUGIN] System initialized with ${this.plugins.size} plugins`);
    }

    /**
     * Load all plugins from the plugins directory
     */
    async loadAllPlugins() {
        const files = fs.readdirSync(this.pluginDir);

        for (const file of files) {
            if (file.endsWith('.js')) {
                const pluginName = path.basename(file, '.js');
                await this.loadPlugin(pluginName);
            }
        }
    }

    /**
     * Load a single plugin
     */
    async loadPlugin(pluginName) {
        try {
            const pluginPath = path.join(this.pluginDir, `${pluginName}.js`);

            if (!fs.existsSync(pluginPath)) {
                console.warn(`[PLUGIN] Plugin not found: ${pluginName}`);
                return false;
            }

            // Dynamic import with cache busting for hot reload
            const pluginUrl = `file:///${pluginPath.replace(/\\/g, '/')}?update=${Date.now()}`;
            const pluginModule = await import(pluginUrl);

            const plugin = pluginModule.default;

            if (!plugin || typeof plugin.initialize !== 'function') {
                console.warn(`[PLUGIN] Invalid plugin format: ${pluginName}`);
                return false;
            }

            // Initialize plugin
            await plugin.initialize();

            this.plugins.set(pluginName, plugin);
            this.pluginConfigs.set(pluginName, {
                name: plugin.name || pluginName,
                version: plugin.version || '1.0.0',
                description: plugin.description || 'No description',
                enabled: true,
                loadedAt: new Date().toISOString()
            });

            console.log(`[PLUGIN] Loaded: ${pluginName} v${plugin.version || '1.0.0'}`);
            this.emit('plugin:loaded', pluginName, plugin);

            return true;
        } catch (error) {
            console.error(`[PLUGIN] Failed to load ${pluginName}:`, error.message);
            return false;
        }
    }

    /**
     * Unload a plugin
     */
    async unloadPlugin(pluginName) {
        const plugin = this.plugins.get(pluginName);

        if (!plugin) {
            console.warn(`[PLUGIN] Plugin not loaded: ${pluginName}`);
            return false;
        }

        try {
            // Call cleanup if available
            if (typeof plugin.cleanup === 'function') {
                await plugin.cleanup();
            }

            this.plugins.delete(pluginName);
            this.pluginConfigs.delete(pluginName);

            console.log(`[PLUGIN] Unloaded: ${pluginName}`);
            this.emit('plugin:unloaded', pluginName);

            return true;
        } catch (error) {
            console.error(`[PLUGIN] Failed to unload ${pluginName}:`, error.message);
            return false;
        }
    }

    /**
     * Reload a plugin (hot reload)
     */
    async reloadPlugin(pluginName) {
        console.log(`[PLUGIN] Reloading: ${pluginName}`);
        await this.unloadPlugin(pluginName);
        return await this.loadPlugin(pluginName);
    }

    /**
     * Get a specific plugin
     */
    getPlugin(pluginName) {
        return this.plugins.get(pluginName);
    }

    /**
     * Get all loaded plugins
     */
    getAllPlugins() {
        return Array.from(this.plugins.values());
    }

    /**
     * Get plugin information
     */
    getPluginInfo(pluginName) {
        return this.pluginConfigs.get(pluginName);
    }

    /**
     * Get all plugin information
     */
    getAllPluginInfo() {
        return Array.from(this.pluginConfigs.values());
    }

    /**
     * Execute a plugin method if it exists
     */
    async executePlugin(pluginName, method, ...args) {
        const plugin = this.plugins.get(pluginName);

        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginName}`);
        }

        if (typeof plugin[method] !== 'function') {
            throw new Error(`Method ${method} not found in plugin ${pluginName}`);
        }

        try {
            return await plugin[method](...args);
        } catch (error) {
            console.error(`[PLUGIN] Error executing ${pluginName}.${method}:`, error.message);
            throw error;
        }
    }

    /**
     * Check if a plugin can handle a specific intent
     */
    async findPluginForIntent(intent, userInput) {
        for (const [name, plugin] of this.plugins.entries()) {
            if (typeof plugin.canHandle === 'function') {
                try {
                    const canHandle = await plugin.canHandle(intent, userInput);
                    if (canHandle) {
                        return name;
                    }
                } catch (error) {
                    console.error(`[PLUGIN] Error checking ${name}.canHandle:`, error.message);
                }
            }
        }
        return null;
    }

    /**
     * Execute handler from appropriate plugin
     */
    async handleIntent(intent, userInput, context) {
        const pluginName = await this.findPluginForIntent(intent, userInput);

        if (!pluginName) {
            return null;
        }

        const plugin = this.plugins.get(pluginName);

        if (typeof plugin.handle === 'function') {
            try {
                return await plugin.handle(intent, userInput, context);
            } catch (error) {
                console.error(`[PLUGIN] Error in ${pluginName}.handle:`, error.message);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        return null;
    }
    /**
     * Validate plugin code before loading
     */
    validatePlugin(code) {
        // Basic syntax check using Function constructor
        try {
            new Function(code);
        } catch (error) {
            return { valid: false, error: `Syntax Error: ${error.message}` };
        }

        // Check for required exports (naive regex check, better would be parsing)
        if (!code.includes('initialize') || !code.includes('handle')) {
            // This is a soft check because they might be dynamically constructed, 
            // but for our generated plugins, they should be explicit.
            // Let's rely on the try/catch in loadPlugin for runtime structure checks.
        }

        return { valid: true };
    }
}

export default PluginLoader;
