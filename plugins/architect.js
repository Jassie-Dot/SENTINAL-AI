/**
 * ARCHITECT - Autonomous Plugin Generator
 * "I build the things that build the things."
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const plugin = {
    name: 'Architect',
    version: '1.0.0',
    description: 'Autonomous capability generator and system evolver.',

    // The Architect needs access to the system internals
    context: null,

    initialize() {
        console.log('[ARCHITECT] Online and ready to evolve.');
    },

    canHandle(intent, userInput) {
        return intent === 'system.evolve' ||
            /(create|add|learn|write|integrate|modify|patch|update|fix) (a )?(plugin|feature|skill|functionality|file|system|core)/i.test(userInput);
    },

    async handle(intent, userInput, context) {
        this.context = context;
        const { systemTools, aiProviders, notify, updateStatus, pluginLoader } = context;

        notify("Initiating genesis sequence... Analyzing requirements.");
        updateStatus("Analyzing integration request...");

        // 1. RESEARCH & PLAN
        const isModification = /(modify|patch|update|fix)/i.test(userInput);
        const requirement = userInput.replace(/(create|add|learn|write|integrate|modify|patch|update|fix) (a )?(plugin|feature|skill|functionality|file|system|core)?/i, '').trim();

        // 2. GENERATE CODE
        updateStatus(`${isModification ? 'Patching' : 'Architecting'} solution for: ${requirement}`);

        try {
            const model = aiProviders.ollama.codingModel || aiProviders.ollama.model;
            const endpoint = aiProviders.ollama.endpoint;

            let prompt = "";
            let targetFileContext = "";
            let originalContent = "";

            if (isModification) {
                // Heuristic to find the file mentioned. 
                // For safety, we only allow modifying files in plugins or lib for now without an explicit full path.
                // Let's ask LLM to identify the file *first* if we wanted to be super robust, 
                // but for a superpower, we will assume the LLM can rewrite a file if we feed it the current one.
                // Simplified: We assume the user names the file or feature.

                // In a production system, we'd do a 2-step: 1) IDENTIFY FILE, 2) PATCH IT.
                prompt = `You are The Architect, an advanced AI system capable of expanding and modifying your own codebase.
               
               TASK: The user wants to modify an existing capability or file with this requirement: "${requirement}".
               Please output the FULL REWRITTEN CODE for the target file to satisfy this.
               
               If it's a plugin, ensure it exports a default object: { name, version, description, initialize, canHandle, handle }
               If it's a core lib, output the valid ES Module.
               
               OUTPUT FORMAT:
               Start your response with the exact relative file path you are intending to modify on the first line as a comment, e.g., // FILE: plugins/some-plugin.js
               Then provide ONLY the full JavaScript code. No markdown code blocks, no other explanations.
               `;
            } else {
                prompt = `You are The Architect, an advanced AI system capable of expanding your own codebase.
               
               TASK: Create a SENTINAL plugin (JavaScript ESModule) that fulfills this requirement: "${requirement}"
               
               CONTEXT:
               - Target Interface: 
                 export default {
                     name: "PluginName",
                     description: "...",
                     initialize() {},
                     canHandle(intent, userInput) { return ... },
                     async handle(intent, userInput, context) { return { success: true, message: "..." }; }
                 }
               - Context 'context' has: systemTools, aiProviders, updateStatus, notify.
               - NO placeholder code. Write FULL functioning code.
               
               OUTPUT FORMAT:
               ONLY return the JavaScript code. No markdown. No conversation.
               `;
            }

            const response = await fetch(`${endpoint}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    prompt: prompt,
                    stream: false,
                    options: { temperature: 0.2 } // Low temp for precise code
                })
            });

            const data = await response.json();
            let code = data.response.trim();

            // Cleanup markdown if present
            code = code.replace(/```javascript\n?/g, '').replace(/```\n?/g, '').trim();

            if (isModification) {
                // Parse the intended file
                const fileMatch = code.match(/^\/\/\s*FILE:\s*([^\n]+)/i);
                if (!fileMatch) {
                    throw new Error("AI did not specify the target file to modify in the expected format (// FILE: path).");
                }
                const intendedFilePath = fileMatch[1].trim();
                const actualCode = code.replace(/^\/\/\s*FILE:\s*([^\n]+)\n/i, '').trim();

                const absPath = path.resolve(process.cwd(), intendedFilePath);

                // BACKUP
                if (fs.existsSync(absPath)) {
                    fs.copyFileSync(absPath, `${absPath}.bak`);
                }

                updateStatus(`Applying patch to ${intendedFilePath}...`);

                // Validate syntax inside try/catch before writing? 
                const validation = pluginLoader.validatePlugin ? pluginLoader.validatePlugin(actualCode) : { valid: true };
                if (!validation.valid && intendedFilePath.includes('plugins/')) {
                    throw new Error(`Generated patch is syntactically invalid: ${validation.error}`);
                }

                await systemTools.executeTool('write_file', {
                    path: absPath,
                    content: actualCode
                });

                if (intendedFilePath.includes('plugins/') || intendedFilePath.includes('lib/')) {
                    // Try to hot reload the specific plugin or notify
                    const pName = path.basename(intendedFilePath, '.js');
                    if (pluginLoader && pluginLoader.loadPlugin) {
                        try { await pluginLoader.loadPlugin(pName); } catch (e) { }
                    }
                }

                // If it's a frontend file, trigger a live reload
                if (intendedFilePath.endsWith('.css') || intendedFilePath.endsWith('.js') || intendedFilePath.endsWith('.html')) {
                    // systemTools doesn't directly expose io, but in server.mjs context might have it, 
                    // or we use a global event/notify that the frontend picks up.
                    // For now, assume context has 'io' or we can require socketManager
                    // To be safe, try dynamic import of socket manager to broadcast
                    try {
                        const { default: sm } = await import('../lib/socket-manager.mjs');
                        if (sm && sm.getIO()) {
                            sm.getIO().emit('sentinal:reload-css');
                        }
                    } catch (e) { console.log('Could not auto-reload UI:', e.message); }
                }

                notify(`Patch successfully applied to ${intendedFilePath}. Backup created at .bak`);
                return { success: true, message: `I have successfully modified \`${intendedFilePath}\` to fulfill the request.` };

            } else {
                // Original CREATE logic
                const nameMatch = code.match(/name:\s*['"]([^'"]+)['"]/);
                let pluginName = nameMatch ? nameMatch[1] : 'generated_feature_' + Date.now();
                pluginName = pluginName.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();

                updateStatus(`Compiling ${pluginName}...`);

                const validation = pluginLoader.validatePlugin ? pluginLoader.validatePlugin(code) : { valid: true };
                if (!validation.valid) {
                    throw new Error(`Generated code invalid: ${validation.error}`);
                }

                const pluginsDir = path.join(process.cwd(), 'plugins');
                const filePath = path.join(pluginsDir, `${pluginName}.js`);

                await systemTools.executeTool('write_file', {
                    path: filePath,
                    content: code
                });

                notify(`Module written to ${pluginName}.js. Initializing integration...`);
                const success = await pluginLoader.loadPlugin(pluginName);

                if (success) {
                    return {
                        success: true,
                        message: `Feature "${pluginName}" has been successfully active. I can now ${requirement}.`
                    };
                } else {
                    return {
                        success: false,
                        message: `Module "${pluginName}" failed to load. Check logs for syntax errors.`
                    };
                }
            }

        } catch (error) {
            console.error('[ARCHITECT] Evolution failed:', error);
            return {
                success: false,
                message: `Evolution protocol failed: ${error.message}`
            };
        }
    }
};

export default plugin;
