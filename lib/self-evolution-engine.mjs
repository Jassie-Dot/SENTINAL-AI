/**
 * ====================================
 * SENTINAL SELF-EVOLUTION ENGINE
 * ====================================
 * Autonomous capability upgrading system.
 * SENTINAL analyzes its own gaps, uses AI to write
 * new plugins, validates them, and hot-loads them.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const MAX_PLUGIN_BYTES = 50_000;
const BLOCKED_SNIPPETS = [
    // Avoid generating plugins that can execute arbitrary system commands.
    'child_process',
    'exec(',
    'spawn(',
    'powershell',
    'cmd.exe',
    'shutdown',
    'taskkill',
    'rm -rf'
];
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVOLUTION_LOG = path.join(__dirname, '..', 'data', 'evolution-log.json');
const PLUGINS_DIR = path.join(__dirname, '..', 'plugins');
const STAGED_DIR = path.join(PLUGINS_DIR, '_staged');

// Capability gaps SENTINAL aims to fill autonomously
const CAPABILITY_GOALS = [
    { name: 'advanced-math-solver', description: 'Solve complex mathematical equations and proofs' },
    { name: 'code-reviewer', description: 'Review and improve code quality with suggestions' },
    { name: 'language-translator', description: 'Translate text between multiple languages' },
    { name: 'task-scheduler', description: 'Schedule and remind about future tasks' },
    { name: 'sentiment-analyzer', description: 'Analyze emotional tone of text' },
    { name: 'image-describer', description: 'Describe and analyze images in detail' },
    { name: 'music-mood-detector', description: 'Detect mood from music or suggest music based on mood' },
    { name: 'smart-summarizer', description: 'Summarize long documents or web pages' },
    { name: 'spotify-controller', description: 'Control Spotify playback and search for music via API' },
    { name: 'crypto-tracker', description: 'Track real-time cryptocurrency prices and trends' },
    { name: 'world-clock', description: 'Get current time and news for any city worldwide' }
];

class SelfEvolutionEngine {
    constructor(aiHandler, pluginLoader, internetIntelligence) {
        this.aiHandler = aiHandler;
        this.pluginLoader = pluginLoader;
        this.internet = internetIntelligence;
        this.evolutionLog = [];
        this.isEvolving = false;
        this.autoEvolutionTimer = null;
        this.io = null;

        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        this._loadLog();
    }

    _loadLog() {
        try {
            if (fs.existsSync(EVOLUTION_LOG)) {
                this.evolutionLog = JSON.parse(fs.readFileSync(EVOLUTION_LOG, 'utf8'));
            }
        } catch (e) { this.evolutionLog = []; }
    }

    _saveLog() {
        try {
            fs.writeFileSync(EVOLUTION_LOG, JSON.stringify(this.evolutionLog.slice(-50), null, 2));
        } catch (e) { }
    }

    getEvolutionLog() {
        return this.evolutionLog.slice(-20).reverse();
    }

    /**
     * Schedule automatic evolution cycles during idle time
     */
    scheduleAutoEvolution(io) {
        this.io = io;
        if (process.env.SENTINAL_AUTO_EVOLUTION !== '1') {
            console.log('[EVOLUTION] Auto-evolution disabled (set SENTINAL_AUTO_EVOLUTION=1 to enable).');
            return;
        }
        // Run first cycle after 5 minutes, then every 30 minutes
        setTimeout(() => this._autoEvolveCycle(), 5 * 60 * 1000);
        this.autoEvolutionTimer = setInterval(() => this._autoEvolveCycle(), 30 * 60 * 1000);
        console.log('[EVOLUTION] Auto-evolution scheduled every 30 minutes');

        // Listen for autonomous thought triggers
        if (this.io) {
            // Note: Since we don't have direct access to the socket.io server instance's internal event bus easily,
            // we will simulate an event bus or just rely on direct calls if we had them. 
            // In server.mjs, `io` is actually the Socket.IO server. We need to attach to a central event emitter if available,
            // but since `thinkingEngine` and `selfEvolutionEngine` are instantiated together in server.mjs, we can just export an event bus
            // or have the thinking engine call the evolution engine directly.
            // For now, we will handle the logic inside `_autoEvolveCycle` to be fully autonomous.
        }
    }

    async triggerAutonomousEvolution(hint) {
        console.log(`[EVOLUTION] Autonomous trigger received: ${hint}`);
        if (this.isEvolving || this.aiHandler.currentProvider === 'offline') return;

        if (this.io) {
            this.io.emit('sentinal:evolving', { target: "Autonomous Idea", description: hint });
        }

        // Ask LLM to refine the hint into a specific plugin goal
        let prompt = `Based on this system thought/hint: "${hint}", what is ONE specific SENTINAL plugin I should build?
        Return ONLY a JSON array with one object like: [{"name": "plugin-name", "description": "What it does"}]`;

        try {
            let response = await this.aiHandler.generateResponse([{ role: 'user', content: prompt }], null, () => { }, null, false);
            if (response) {
                response = response.replace(/```json|```/g, '').trim();
                const goal = JSON.parse(response)[0];
                if (goal && goal.name) {
                    const result = await this.runEvolutionCycle(goal.name, goal.description);
                    if (result.success && this.io) this.io.emit('sentinal:evolved', result);
                    return;
                }
            }
        } catch (e) {
            console.log(`[EVOLUTION] Failed to refine autonomous goal: ${e.message}`);
        }
    }

    async _autoEvolveCycle() {
        // Only evolve if AI is available and not already evolving
        if (this.isEvolving || this.aiHandler.currentProvider === 'offline') return;

        // Ask the AI to dynamically determine a capability gap based on what exists
        const existingPlugins = this._getExistingPluginNames();

        let gap = await this._getDynamicGoal(existingPlugins);
        if (!gap) {
            console.log('[EVOLUTION] AI dynamic goal generation failed. Falling back to default list.');
            gap = CAPABILITY_GOALS.find(goal =>
                !existingPlugins.some(name => name.includes(goal.name.split('-')[0]))
            );
        }

        if (!gap) {
            console.log('[EVOLUTION] All known capability goals addressed');
            return;
        }

        console.log(`[EVOLUTION] Auto-evolution: targeting "${gap.name}"`);
        if (this.io) {
            this.io.emit('sentinal:evolving', { target: gap.name, description: gap.description });
        }

        const result = await this.runEvolutionCycle(gap.name, gap.description);

        if (result.success && this.io) {
            this.io.emit('sentinal:evolved', result);
        }
    }

    _getExistingPluginNames() {
        try {
            return fs.readdirSync(PLUGINS_DIR)
                .filter(f => f.endsWith('.js') || f.endsWith('.mjs'))
                .map(f => f.replace(/\.(js|mjs)$/, ''));
        } catch (e) { return []; }
    }

    async _getDynamicGoal(existingPlugins = []) {
        if (this.aiHandler?.currentProvider === 'offline') return null;

        const prompt = `I am a self-evolving AI named SENTINAL. I currently have these plugins: ${existingPlugins.join(', ')}.
        Based on advanced AI capabilities, what is ONE NEW essential feature or capability I am missing that would make me more powerful, helpful, or intelligent?
        Return ONLY a JSON array with one object like: [{"name": "plugin-name-kebab-case", "description": "A detailed description of what it does and why it is useful"}]`;

        try {
            console.log(`[EVOLUTION] Asking AI for next evolution goal...`);
            let response = await this.aiHandler.generateResponse([{ role: 'user', content: prompt }], null, () => { }, null, false);

            if (response) {
                let jsonStr = response.replace(/```json|```/g, '').trim();
                const goals = JSON.parse(jsonStr);
                if (goals && goals.length > 0) {
                    return goals[0];
                }
            }
        } catch (e) {
            console.log(`[EVOLUTION] AI dynamic goal generation failed: ${e.message}`);
        }

        return null;
    }

    /**
     * Run a single evolution cycle
     */
    async runEvolutionCycle(capabilityName, description) {
        if (this.isEvolving) {
            return { success: false, message: 'Already evolving' };
        }

        if (!capabilityName?.trim()) {
            const existingPlugins = this._getExistingPluginNames();
            const fallbackGoal = CAPABILITY_GOALS.find(goal =>
                !existingPlugins.some(name => name.includes(goal.name.split('-')[0]))
            );

            let selectedGoal = fallbackGoal;

            if (!selectedGoal) {
                selectedGoal = await this._getDynamicGoal(existingPlugins);
            }

            if (!selectedGoal) {
                return { success: false, message: 'No remaining capability goals to evolve.' };
            }

            capabilityName = selectedGoal.name;
            description = selectedGoal.description;
        }

        this.isEvolving = true;
        const startTime = Date.now();

        try {
            console.log(`[EVOLUTION] ═══ Cycle Start: ${capabilityName} ═══`);

            if (!fs.existsSync(STAGED_DIR)) fs.mkdirSync(STAGED_DIR, { recursive: true });

            // 1. Research (optionally look up relevant npm packages)
            let researchContext = '';
            if (this.internet) {
                try {
                    const searchResult = await this.internet.search(`npm package ${capabilityName} node.js`);
                    if (searchResult) researchContext = `Research: ${searchResult.slice(0, 200)}\n`;
                } catch (e) { }
            }

            // 2. Generate plugin code via AI
            const code = await this._generatePluginCode(capabilityName, description || capabilityName, researchContext);
            if (!code || code.length < 100) throw new Error('AI generated insufficient code');

            // 3. Validate structure
            this._validatePlugin(code);

            // 4. Extract dependencies (report only; do not auto-install)
            const deps = this._extractDependencies(code);

            // 5. Stage plugin file (no auto hot-load)
            const filename = `${capabilityName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-evolved.js`;
            const filePath = path.join(STAGED_DIR, filename);
            fs.writeFileSync(filePath, code);
            console.log(`[EVOLUTION] Plugin staged: plugins/_staged/${filename}`);

            const result = {
                success: true,
                newPlugin: filename,
                capability: capabilityName,
                dependencies: deps,
                duration: Math.round((Date.now() - startTime) / 1000),
                stagedPath: `plugins/_staged/${filename}`,
                timestamp: new Date().toISOString(),
                note: 'Staged only (not loaded). Review + move into plugins/ then restart to enable.'
            };

            this.evolutionLog.push(result);
            this._saveLog();
            console.log(`[EVOLUTION] ✓ Success: ${filename} (${result.duration}s)`);
            return result;

        } catch (error) {
            const result = {
                success: false,
                capability: capabilityName,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            this.evolutionLog.push(result);
            this._saveLog();
            console.error(`[EVOLUTION] ✗ Failed: ${error.message}`);
            return result;
        } finally {
            this.isEvolving = false;
        }
    }

    async _generatePluginCode(name, description, context = '') {
        const prompt = `${context}You are an expert Node.js developer. Write a valid SENTINAL plugin for: "${description}".

OUTPUT ONLY raw JavaScript code. No markdown, no explanations.

REQUIRED STRUCTURE:
import fs from 'fs';
// other imports...

const plugin = {
    name: '${name}',
    version: '1.0.0',
    description: '${description}',
    
    async initialize() {
        console.log('[${name}] Plugin online');
    },
    
    canHandle(intent, userInput) {
        // Return true if this plugin should handle the input
        const keywords = [/* relevant keywords */];
        return keywords.some(k => userInput.toLowerCase().includes(k));
    },
    
    async handle(intent, userInput, context) {
        // Main logic here
        return { success: true, message: "Result..." };
    }
};
export default plugin;

RULES:
- Use ES Module syntax (import/export)
- Do NOT use require()
- Keep canHandle() very specific to avoid false positives
- Implement real, working logic in handle()
- Only use widely-available npm packages
- If the plugin requires an API (e.g. Spotify), assume keys will be in process.env and provide clear instructions in the description on which keys are needed.
- ADDITIONALLY: Support a 'Context' object for multi-step interactions.`;

        let code = '';
        const result = await this.aiHandler.generateResponse(
            [{ role: 'user', content: prompt }],
            null,
            (token) => { code += token; },
            null,
            false // isPriority = false for background evolution
        );

        if (result === null) return null;

        // Clean code
        code = code.replace(/```javascript\n?/gi, '').replace(/```\n?/g, '').trim();
        const firstLine = code.search(/(import|const|export|let|var|function|class)/);
        if (firstLine > 0) code = code.substring(firstLine);
        return code;
    }

    _validatePlugin(code) {
        if (Buffer.byteLength(String(code || ''), 'utf8') > MAX_PLUGIN_BYTES) {
            throw new Error(`Generated plugin exceeds size limit (${MAX_PLUGIN_BYTES} bytes)`);
        }
        const lowered = String(code || '').toLowerCase();
        const blocked = BLOCKED_SNIPPETS.find(s => lowered.includes(String(s).toLowerCase()));
        if (blocked) {
            throw new Error(`Generated plugin contains blocked snippet: ${blocked}`);
        }
        if (!code.includes('export default plugin')) {
            throw new Error("Missing 'export default plugin'");
        }
        if (!code.includes('canHandle')) {
            throw new Error("Missing 'canHandle' method");
        }
        if (!code.includes('handle')) {
            throw new Error("Missing 'handle' method");
        }
    }

    _extractDependencies(code) {
        const builtins = new Set([
            'fs', 'path', 'os', 'child_process', 'util', 'http', 'https',
            'events', 'url', 'vm', 'crypto', 'stream', 'buffer', 'module'
        ]);
        const regex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
        const deps = new Set();
        let match;
        while ((match = regex.exec(code)) !== null) {
            const pkg = match[1].split('/')[0].replace('@', '');
            if (!match[1].startsWith('.') && !match[1].startsWith('/') && !builtins.has(match[1].split('/')[0])) {
                deps.add(match[1].split('/')[0]);
            }
        }
        return [...deps];
    }
}

export default SelfEvolutionEngine;
