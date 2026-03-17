/**
 * Capability Integrator Plugin
 * Enables SENTINAL to self-evolve by generating and installing new plugins on demand.
 */
import fetch from "node-fetch";
import path from "path";

const plugin = {
    name: "Capability Integrator",
    version: "1.0.0",
    description: "Autonomously generates and integrates new capabilities.",

    async initialize() {
        console.log("[PLUGIN] Capability Integrator Initialized");
    },

    canHandle(intent, userInput) {
        // Matches: "create a plugin to...", "add capability...", "integrate...", "enable..."
        // Also matches specific "system.integrate" or "system.upgrade" intents if they existed,
        // but broadly catching creation commands here.
        return (
            intent === "system.integrate" ||
            intent === "system.upgrade" ||
            /\b(create|make|write|generate|add|build)\s+a?\s*(new\s*)?(plugin|capability|feature|integration)/i.test(userInput) ||
            /\b(integrate|enable|install)\s+.*capability/i.test(userInput)
        );
    },

    async handle(intent, userInput, context) {
        const { pluginLoader, systemTools, updateStatus, notify } = context;

        if (!pluginLoader || !systemTools) {
            return {
                success: false,
                message: "Error: Critical system internals (pluginLoader/systemTools) are missing from context. Cannot proceed with self-integration."
            };
        }

        try {
            notify("Researshing and designing new capability...");
            updateStatus("Designing plugin architecture...");

            const aiHandler = context.aiHandler || (global.sentinalAI ? global.sentinalAI : null);
            if (!aiHandler) {
                return { success: false, message: "AI handler is unavailable for self-integration." };
            }

            const analysis = await this.askOllama(analysisPrompt, true, aiHandler); // true = expecting JSON
            if (!analysis || !analysis.name) {
                return { success: false, message: "I couldn't understand what plugin you want me to build." };
            }

            const pluginName = analysis.name.toLowerCase().replace(/[^a-z0-9-]/g, "");

            notify(`I am designing the '${pluginName}' plugin. usage: ${analysis.keywords}...`);
            updateStatus("Writing code...");

            // 2. GENERATE CODE
            const codePrompt = `
                Write a complete, working JavaScript plugin file for a system called "SENTINAL".
                
                Plugin Name: ${pluginName}
                Description: ${analysis.description}
                Trigger Keywords: ${analysis.keywords}
                
                API RULES:
                1. Must export a default object with { name, version, initialize, canHandle, handle }.
                2. 'handle' receives (intent, userInput, context).
                3.Context differs per plugin but usually contains simple objects.
                4. RETURN A JSON object with { success: true, message: "...", data: ... } on success.
                5. Use 'node-fetch' for API calls if needed.
                6. Do NOT use markdown code blocks. Return ONLY the raw JavaScript code.
                7. The code must be ES Module format (import/export).
                
                TEMPLATE:
                import fetch from 'node-fetch';
                const plugin = {
                    name: '${pluginName}',
                    version: '1.0.0',
                    initialize() { console.log('[PLUGIN] ${pluginName} loaded'); },
                    canHandle(intent, text) { return /${analysis.keywords}/i.test(text); },
                    async handle(intent, text, context) {
                        // ... logic ...
                        return { success: true, message: "Done" };
                    }
                };
                export default plugin;
                
                GENERATE THE FULL CODE NOW. NO EXPLANATIONS.
            `;

            let code = await this.askOllama(codePrompt, false, aiHandler);

            // Clean up Markdown formatting if Ollama adds it despite instructions
            code = code.replace(/```javascript/g, "").replace(/```/g, "").trim();

            if (!code.includes("export default")) {
                return { success: false, message: "Failed to generate valid plugin code." };
            }

            // 3. WRITE FILE
            updateStatus("Installing plugin...");
            const pluginsDir = path.join(process.cwd(), "plugins");
            const filePath = path.join(pluginsDir, `${pluginName}.js`);

            await systemTools.executeTool('write_file', {
                path: filePath,
                content: code
            });

            // 4. HOT LOAD
            updateStatus("Initializing...");
            const loaded = await pluginLoader.loadPlugin(pluginName);

            if (loaded) {
                return {
                    success: true,
                    message: `Successfully integrated functionality: **${pluginName}**. \n\nYou can now use it by saying things like: "${analysis.keywords.split('|')[0]}..."`,
                    data: { plugin: pluginName }
                };
            } else {
                return {
                    success: false,
                    message: `I wrote the code for '${pluginName}', but failed to load it into memory. Check the logs.`
                };
            }

        } catch (error) {
            console.error(error);
            return {
                success: false,
                message: `Self-integration failed: ${error.message}`
            };
        }
    },

    async askOllama(prompt, jsonMode = false, aiHandler = null) {
        try {
            // Prefer the centralized AI Handler for better provider management
            if (aiHandler) {
                let response = "";
                await aiHandler.generateResponse(
                    [{ role: "system", content: prompt }],
                    null,
                    (token) => { response += token; },
                    null,
                    true // Priority
                );
                return jsonMode ? JSON.parse(response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()) : response;
            }

            // Fallback to direct Ollama if AIHandler is missing
            const response = await fetch("http://127.0.0.1:11434/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "llama3.2", // Use a widely available local model
                    prompt: prompt,
                    stream: false,
                    format: jsonMode ? "json" : undefined
                })
            });
            const data = await response.json();
            return jsonMode ? JSON.parse(data.response) : data.response;
        } catch (e) {
            console.error("AI Generation Error in Capability Integrator:", e);
            throw new Error("AI generation failed. Please check your AI providers.");
        }
    }
};

export default plugin;
