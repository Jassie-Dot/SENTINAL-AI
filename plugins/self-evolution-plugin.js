/**
 * Self-Evolution Plugin v2.1 (Enhanced)
 * Dynamically generates, validates, and installs new plugins using AI.
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const MAX_PLUGIN_BYTES = 50_000;
const BLOCKED_SNIPPETS = [
    // Prevent generated code from embedding arbitrary command execution primitives
    'child_process',
    'exec(',
    'spawn(',
    'powershell',
    'cmd.exe',
    'shutdown',
    'taskkill',
    'rm -rf'
];

const plugin = {
    name: 'Self-Evolution',
    version: '2.1.0',
    description: 'Autonomous feature integration using Generative AI',

    async initialize() {
        console.log('[EVOLUTION] AI-Driven Evolution System Online');
    },

    canHandle(intent, userInput) {
        return intent === 'system.integrate' || intent === 'system.upgrade';
    },

    async handle(intent, userInput, context) {
        if (intent === 'system.upgrade') {
            return {
                success: true,
                message: "### ⚡ Self-Evolution Protocol\n\nI am ready to enhance my core logic or add new modular capabilities, Sir. Would you like me to **scan for potential upgrades**, or is there a **specific feature** you wish for me to integrated?"
            };
        }

        if (intent === 'system.integrate') {
            const feature = context.entities.feature || userInput.replace(/integrate|add|install/i, '').trim();
            if (!feature) return { success: false, message: "What feature should I integrate, Sir?" };

            return await this.integrateFeature(feature, context);
        }
    },

    /**
     * Integrate a new feature by spawning AI to write code
     */
    async integrateFeature(feature, context) {
        console.log(`[EVOLUTION] Initiating protocol for: ${feature}`);

        // Helper to send updates if available
        const status = (msg) => context.updateStatus && context.updateStatus(msg);
        const notify = (msg) => context.notify && context.notify(msg);

        try {
            status(`ANALYZING: ${feature.toUpperCase()}`);
            notify(`🔄 **Integration Protocol Initiated**\nAnalyze target: \`${feature}\`...`);

            // 1. Generate Code using AI
            status("GENERATING NEURAL CODE");
            const code = await this.generatePluginCode(feature);
            if (!code) throw new Error("AI Code Generation failed (Empty response).");

            // 2. Validate Syntax
            status("VALIDATING SYNTAX");
            this.validateSyntax(code);

            // 3. Analyze Dependencies (report only; do not auto-install)
            status("ANALYZING DEPENDENCIES");
            const dependencies = this.extractDependencies(code);

            // 4. Save plugin as a staged candidate (no auto hot-load)
            status("STAGING MODULE");
            const filename = `${feature.toLowerCase().replace(/[^a-z0-9]/g, '-')}-plugin.js`;
            const pluginDir = path.join(process.cwd(), 'plugins');
            const filePath = path.join(pluginDir, filename);

            console.log(`[EVOLUTION] Writing staged plugin to ${filename}...`);
            fs.writeFileSync(filePath, code);

            status("AWAITING HUMAN REVIEW");

            return {
                success: true,
                message: `### ✅ Integration Candidate Ready\n\n` +
                    `**Module Name:** ${feature}\n` +
                    `**Status:** Staged (NOT auto-loaded)\n` +
                    `**Source:** \`plugins/${filename}\`\n` +
                    `**Dependencies (not installed):** ${dependencies.length > 0 ? `\`${dependencies.join(', ')}\`` : 'None'}\n\n` +
                    `> [!REVIEW]\n` +
                    `> 1. Open the file in your editor.\n` +
                    `> 2. Manually install any dependencies you accept.\n` +
                    `> 3. Restart SENTINAL to load it.`,
                data: { filename, dependencies }
            };

        } catch (error) {
            console.error('[EVOLUTION] Error:', error);
            status("INTEGRATION FAILED");

            // Provide more specific error feedback
            let userErrorMsg = error.message;
            if (error.message.includes("SyntaxError")) {
                userErrorMsg = "Generated code contained syntax errors.";
            }

            return {
                success: false,
                message: `❌ **Evolution Protocol Failed**\n**Reason:** ${userErrorMsg}\n\nRetry might produce better results.`
            };
        }
    },

    /**
     * Call Ollama to generate plugin code with strict prompting
     */
    async generatePluginCode(feature) {
        // Enforce a random suffix to ensure unique plugin names if retried
        const uniqueId = Math.random().toString(36).substring(7);

        const prompt = `You are an expert AI Engineer. Write a valid Node.js plugin for a system called "SENTINAL".
        
        TASK: Create a plugin to handle user intent: "${feature}".
        
        STRICT OUTPUT FORMAT:
        Return ONLY valid Javascript code. NO markdown formatting, NO explanations, NO intro/outro text.
        
        PLUGIN STRUCTURE:
        The code MUST export a default object with this exact structure:
        
        import fs from 'fs'; 
        // ... other imports ...
        
        const plugin = {
            name: 'Plugin_${uniqueId}',
            version: '1.0.0',
            description: '${feature}',
            
            // Called on load
            async initialize() { 
                console.log('[${feature}] Initialized'); 
            },
            
            // Logic to decide if this plugin handles the input
            // CRITICAL: Return true ONLY if input matches '${feature}'
            canHandle(intent, userInput) { 
                // Example: return intent === 'some.custom.intent' || userInput.includes('keyword');
                // You can define custom intents or just regex match userInput
                const keywords = ['${feature.split(' ')[0]}', '${feature}'];
                return keywords.some(k => userInput.toLowerCase().includes(k.toLowerCase()));
            },
            
            // Main execution logic
            async handle(intent, userInput, context) { 
                // Implement the logic here
                return { success: true, message: "Result of operation..." }; 
            }
        };
        export default plugin;
        
        RULES:
        1. Use ES Module syntax (import/export).
        2. Use strictly standard or popular NPM packages (moment, axios, etc).
        3. Do NOT use \`require\`.
        4. Focus on the 'handle' function logic.
        5. Ensure the code is syntactically correct.
        6. Do not use 'formatted' markdown blocks (\`\`\`). Just raw text code.
        `;

        const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: process.env.OLLAMA_MODEL || 'llama3.2',
                messages: [{ role: "user", content: prompt }],
                stream: false,
                options: {
                    temperature: 0.2, // Low temp for code stability
                    top_p: 0.5
                }
            })
        });

        const data = await response.json();
        let code = data.message?.content || "";

        // enhanced code cleaning
        return this.cleanCode(code);
    },

    cleanCode(rawCode) {
        if (!rawCode) return "";

        // Remove markdown code blocks
        let code = rawCode.replace(/```javascript/gi, '').replace(/```/g, '').trim();

        // Remove any text before the first "import" or "const" or "export"
        const firstValidLine = code.search(/(import|const|export|let|var|function|class)/);
        if (firstValidLine > 0) {
            code = code.substring(firstValidLine);
        }

        return code;
    },

    /**
     * Validate JS structure + basic safety constraints.
     * (This is not a full sandbox. It is a defensive gate for staged plugins.)
     */
    validateSyntax(code) {
        try {
            if (Buffer.byteLength(String(code || ''), 'utf8') > MAX_PLUGIN_BYTES) {
                throw new Error(`Plugin exceeds size limit (${MAX_PLUGIN_BYTES} bytes).`);
            }

            const lowered = String(code || '').toLowerCase();
            const blocked = BLOCKED_SNIPPETS.find(s => lowered.includes(String(s).toLowerCase()));
            if (blocked) {
                throw new Error(`Generated plugin contains blocked snippet: ${blocked}`);
            }

            if (!code.includes('export default plugin')) {
                throw new Error("Missing 'export default plugin' statement.");
            }

            if (!code.includes('canHandle')) {
                throw new Error("Missing 'canHandle' method path.");
            }

            return true;
        } catch (e) {
            throw new Error(`Syntax Validation Error: ${e.message}`);
        }
    },

    extractDependencies(code) {
        const regex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
        const deps = [];
        let match;
        while ((match = regex.exec(code)) !== null) {
            const pkg = match[1];
            // Ignore node built-ins and local files
            if (!pkg.startsWith('.') && !pkg.startsWith('/') && !['fs', 'path', 'os', 'child_process', 'util', 'http', 'https', 'events', 'url', 'vm', 'crypto'].includes(pkg)) {
                deps.push(pkg);
            }
        }
        return [...new Set(deps)];
    },

    // Dependency installation must be done manually in production.
};

export default plugin;
