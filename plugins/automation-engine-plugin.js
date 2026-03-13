/**
 * Automation Engine Plugin for SENTINAL
 * Coordinates multi-step tasks using AI planning and existing plugins.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const plugin = {
    name: 'AutomationEngine',
    version: '1.0.0',
    description: 'Advanced multi-step task automation',

    async initialize() {
        console.log('[AUTOMATION-ENGINE] Plugin initialized');
    },

    async canHandle(intent, userInput) {
        return intent === 'system.automation' || /open .* and (write|type|click|search|do)/i.test(userInput);
    },

    async handle(intent, userInput, context) {
        try {
            console.log(`[AUTOMATION-ENGINE] Planning task for: "${userInput}"`);
            
            // 1. Plan the steps using AI
            const plan = await this.planTask(userInput);
            if (!plan || !plan.steps || plan.steps.length === 0) {
                return { success: false, message: "I couldn't devise a clear plan for that task, Sir." };
            }

            console.log(`[AUTOMATION-ENGINE] Plan devised: ${JSON.stringify(plan)}`);

            // 2. Execute steps sequentially
            const results = [];
            for (const step of plan.steps) {
                console.log(`[AUTOMATION-ENGINE] Executing step: ${step.type} - ${JSON.stringify(step.params)}`);
                const result = await this.executeStep(step);
                results.push(result);
                
                if (!result.success && plan.stopOnError) {
                    return { 
                        success: false, 
                        message: `Automation failed at step "${step.type}": ${result.message}`,
                        data: { results }
                    };
                }
                
                // Small delay between steps for UI stability
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            return {
                success: true,
                message: `Task completed successfully, Sir. ${plan.finalMessage || ""}`,
                data: { results }
            };

        } catch (error) {
            console.error('[AUTOMATION-ENGINE] Error:', error.message);
            return {
                success: false,
                message: `Automation engine encountered an error: ${error.message}`
            };
        }
    },

    async planTask(userInput) {
        const aiHandler = global.sentinalAI;
        if (!aiHandler) throw new Error("AI Handler not available");

        const prompt = `You are the Automation Planner for SENTINAL. 
Translate the user's request into a JSON sequence of automation steps.

Available Step Types:
1. "open_app" (params: { name: string })
2. "wait_for_window" (params: { title: string, timeout?: number })
3. "focus_window" (params: { title: string })
4. "type_text" (params: { element?: string, text: string })
5. "click_element" (params: { name: string })
6. "run_command" (params: { command: string })

User Request: "${userInput}"

Output ONLY valid JSON in this format:
{
  "steps": [
    { "type": "step_type", "params": { ... } }
  ],
  "stopOnError": true,
  "finalMessage": "Optional summary of what was done"
}

Example for "open notepad and write Hello":
{
  "steps": [
    { "type": "open_app", "params": { "name": "notepad" } },
    { "type": "wait_for_window", "params": { "title": "Notepad" } },
    { "type": "type_text", "params": { "text": "Hello" } }
  ],
  "stopOnError": true,
  "finalMessage": "I have opened Notepad and typed the message for you."
}
`;

        let response = "";
        await aiHandler.generateResponse(
            [{ role: "system", content: prompt }],
            null,
            (token) => response += token
        );

        // Extract JSON
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    },

    async executeStep(step) {
        const loader = global.sentinalPlugins;
        
        switch (step.type) {
            case 'open_app':
                return await loader.handleIntent('system.open', `open ${step.params.name}`, {});
            
            case 'wait_for_window':
                const uiaWait = loader.getPlugin('uia-plugin');
                return await uiaWait.waitForWindow(step.params.title, step.params.timeout);
            
            case 'focus_window':
                const uiaFocus = loader.getPlugin('uia-plugin');
                return await uiaFocus.focusWindow(step.params.title);
            
            case 'type_text':
                const uiaType = loader.getPlugin('uia-plugin');
                return await uiaType.typeIntoElement(step.params.element || "", step.params.text);
            
            case 'click_element':
                const uiaClick = loader.getPlugin('uia-plugin');
                return await uiaClick.clickElement(step.params.name);
            
            case 'run_command':
                const sysControl = loader.getPlugin('system-control-plugin');
                return await sysControl.runCommand(step.params.command);
            
            default:
                return { success: false, message: `Unknown step type: ${step.type}` };
        }
    }
};

export default plugin;
