/**
 * ====================================
 * AUTONOMOUS CODE EXECUTION PLUGIN
 * ====================================
 * Allows SENTINAL to write, save, and execute NodeJS scripts autonomously.
 * If he encounters a novel problem without a dedicated plugin, he can simply
 * program a solution on the fly and read the output.
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import os from 'os';
import util from 'util';

const execPromise = util.promisify(exec);

// A designated folder in the system temporary directory for SENTINAL's scratchpad scripts
const SCRATCHPAD_DIR = path.join(os.tmpdir(), 'sentinal_scratchpad');

class Plugin {
    constructor() {
        this.name = 'Autonomous Code Execution';
        this.version = '1.0.0';
        this.description = 'Allows SENTINAL to write and run code to solve unclassified problems.';
        this.intents = ['system.execute_code'];
    }

    async initialize() {
        console.log('[CODE EXECUTION] Plugin initialized');

        if (!fs.existsSync(SCRATCHPAD_DIR)) {
            fs.mkdirSync(SCRATCHPAD_DIR, { recursive: true });
        }
        return true;
    }

    async canHandle(intent, userInput) {
        return this.intents.includes(intent);
    }

    async handle(intent, userInput, context = {}) {
        if (intent !== 'system.execute_code') return null;

        const aiHandler = context.aiHandler || (global.sentinalAI ? global.sentinalAI : null);
        if (!aiHandler) {
            return {
                success: false,
                message: "Sir, I do not have access to my primary cognitive core to write code right now.",
                data: {}
            };
        }

        try {
            // 1. Analyze and write the code
            const scriptPrompt = `
You are SENTINAL. I need you to write a single, complete NodeJS script to solve the following request: "${userInput}"
Only output valid NodeJS code wrapped in \`\`\`javascript \`\`\`.
Do NOT include any external dependencies unless they are built-in Node modules (fs, path, os, child_process, util).
The script MUST output its final answer using console.log() so I can read it.
Ensure the code is robust, catches errors, and prints meaningful results.
`;

            console.log(`[CODE EXECUTION] Thinking of a script to solve: "${userInput}"`);

            let codeResponse = '';
            await aiHandler.generateResponse(
                [{ role: 'system', content: scriptPrompt }],
                null,
                (token) => { codeResponse += token; },
                null,
                true // Is Priority
            );

            // 2. Extract code block
            const match = codeResponse.match(/```(?:javascript|js)?\n([\s\S]*?)```/i);
            if (!match) {
                return {
                    success: false,
                    message: "Sir, I was unable to formulate a syntactically valid script to accomplish that task.",
                    data: { raw: codeResponse }
                };
            }

            const code = match[1].trim();
            const filename = `sentinal_task_${Date.now()}.js`;
            const filepath = path.join(SCRATCHPAD_DIR, filename);

            // 3. Save code to scratchpad
            fs.writeFileSync(filepath, code);
            console.log(`[CODE EXECUTION] Script written to ${filepath}`);

            // 4. Execute the code
            console.log(`[CODE EXECUTION] Running script...`);
            const { stdout, stderr } = await execPromise(`node "${filepath}"`, { timeout: 15000 }); // 15s timeout

            let finalOutput = stdout.trim();
            if (stderr) {
                finalOutput += `\nError Output: ${stderr.trim()}`;
            }

            // Cleanup
            try { fs.unlinkSync(filepath); } catch (e) { }

            // 5. Naturalize the output if it's too raw or long
            let finalMessage = finalOutput;
            if (finalOutput.length > 200 || !finalOutput) {
                const summarizePrompt = `You are SENTINAL. You just executed a script to solve: "${userInput}". The terminal output was:\n\n${finalOutput || "No output"}\n\nSummarize the result for the user in 1-2 conversational sentences.`;
                let summary = "";
                await aiHandler.generateResponse(
                    [{ role: 'system', content: summarizePrompt }],
                    null,
                    (token) => { summary += token; }
                );
                finalMessage = summary.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            } else {
                finalMessage = `Sir, the script executed successfully. Result: ${finalOutput}`;
            }

            return {
                success: true,
                message: finalMessage,
                data: { stdout, stderr, code }
            };

        } catch (error) {
            console.error('[CODE EXECUTION] Failure:', error);
            return {
                success: false,
                message: `Sir, the execution failed. Error log: ${error.message}`,
                data: { error: error.message }
            };
        }
    }
}

export default new Plugin();
