import { TOOL_DEFINITIONS, executeTool } from './system-tools.mjs';

const JSON_BLOCK_REGEX = /```json\s*([\s\S]*?)```/i;
const MAX_STEPS = 3;

function cleanJsonPayload(text = '') {
    const fenced = text.match(JSON_BLOCK_REGEX);
    if (fenced) return fenced[1].trim();

    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
        return text.slice(start, end + 1).trim();
    }

    return text.trim();
}

function summarizeToolResult(result) {
    if (!result) return 'No result returned.';

    if (result.success === false) {
        return `Failed: ${result.error || result.message || 'Unknown error'}`;
    }

    if (typeof result.message === 'string' && result.message.trim()) {
        return result.message.trim();
    }

    if (typeof result.stdout === 'string' && result.stdout.trim()) {
        return result.stdout.trim().slice(0, 1500);
    }

    if (typeof result.content === 'string' && result.content.trim()) {
        return result.content.trim().slice(0, 1500);
    }

    return JSON.stringify(result).slice(0, 1500);
}

function isActionable(userInput = '') {
    return /\b(open|launch|start|run|execute|install|list|show|read|write|create|edit|modify|delete|move|copy|search|find|scan|inspect|debug|diagnose|fix|upgrade|improve|analyze|take screenshot|processes|system info|cpu|memory|disk)\b/i.test(userInput);
}

function normalizePlan(plan) {
    if (!plan || typeof plan !== 'object') return null;

    const mode = typeof plan.mode === 'string' ? plan.mode : 'respond';
    const steps = Array.isArray(plan.steps) ? plan.steps.slice(0, MAX_STEPS) : [];

    return {
        mode,
        response: typeof plan.response === 'string' ? plan.response.trim() : '',
        rationale: typeof plan.rationale === 'string' ? plan.rationale.trim() : '',
        steps: steps
            .filter(step => step && typeof step.tool === 'string')
            .map(step => ({
                tool: step.tool.trim(),
                reason: typeof step.reason === 'string' ? step.reason.trim() : '',
                params: step.params && typeof step.params === 'object' ? step.params : {}
            }))
    };
}

export class AutonomyEngine {
    constructor(aiHandler, pluginLoader) {
        this.aiHandler = aiHandler;
        this.pluginLoader = pluginLoader;
        this.toolDefinitions = TOOL_DEFINITIONS;
    }

    getStatus() {
        return {
            enabled: true,
            tools: this.toolDefinitions.map(tool => tool.name),
            maxSteps: MAX_STEPS
        };
    }

    async handleRequest({
        userInput,
        sessionId,
        history = [],
        systemPrompt,
        intentAnalysis,
        socket
    }) {
        if (!userInput?.trim() || !isActionable(userInput) || !this.aiHandler) {
            return null;
        }

        const plan = await this.createPlan({ userInput, history, systemPrompt, intentAnalysis });
        if (!plan) return null;

        if (plan.mode === 'respond') {
            return plan.response ? { handled: true, reply: plan.response, plan } : null;
        }

        if (!plan.steps.length) return null;

        const observations = [];

        for (const step of plan.steps) {
            const toolDef = this.toolDefinitions.find(tool => tool.name === step.tool);
            if (!toolDef) {
                observations.push({
                    tool: step.tool,
                    success: false,
                    summary: `Unknown tool: ${step.tool}`
                });
                continue;
            }

            try {
                const result = await executeTool(step.tool, step.params);
                observations.push({
                    tool: step.tool,
                    success: result?.success !== false,
                    summary: summarizeToolResult(result),
                    result
                });

                if (socket) {
                    socket.emit('autonomy:step', {
                        sessionId,
                        tool: step.tool,
                        success: result?.success !== false,
                        summary: summarizeToolResult(result)
                    });
                }
            } catch (error) {
                observations.push({
                    tool: step.tool,
                    success: false,
                    summary: `Execution failed: ${error.message}`
                });
            }
        }

        const reply = await this.summarizeExecution({
            userInput,
            history,
            systemPrompt,
            plan,
            observations
        });

        return {
            handled: true,
            reply,
            plan,
            observations
        };
    }

    async createPlan({ userInput, history, systemPrompt, intentAnalysis }) {
        if (this.aiHandler.currentProvider === 'offline') return null;

        const toolSummary = this.toolDefinitions.map(tool => {
            const params = Object.keys(tool.parameters || {}).join(', ') || 'none';
            return `- ${tool.name}: ${tool.description} | params: ${params}`;
        }).join('\n');

        const prompt = `${systemPrompt}

You are planning tool use for the SENTINAL autonomy engine.
Return ONLY valid JSON with this schema:
{
  "mode": "respond" | "tool",
  "response": "required only if mode is respond",
  "rationale": "short reason",
  "steps": [
    { "tool": "tool_name", "reason": "why", "params": { "field": "value" } }
  ]
}

Rules:
- Prefer direct tool execution for concrete computer tasks.
- Use at most ${MAX_STEPS} steps.
- Only use these tools:
${toolSummary}
- If the request is conversational or tools are unnecessary, use mode "respond".
- Never invent tools or params.

User request: ${userInput}
Intent analysis: ${JSON.stringify(intentAnalysis || {})}
Recent history:
${JSON.stringify(history.slice(-6), null, 2)}`;

        let raw = '';
        await this.aiHandler.generateResponse(
            [{ role: 'user', content: prompt }],
            null,
            token => { raw += token; }
        );

        try {
            const parsed = JSON.parse(cleanJsonPayload(raw));
            return normalizePlan(parsed);
        } catch {
            return null;
        }
    }

    async summarizeExecution({ userInput, history, systemPrompt, plan, observations }) {
        if (this.aiHandler.currentProvider === 'offline') {
            const firstFailure = observations.find(item => !item.success);
            if (firstFailure) return firstFailure.summary;
            return observations.map(item => item.summary).join('\n');
        }

        const prompt = `${systemPrompt}

You are summarizing completed tool executions for the user.
Be concise, accurate, and avoid claiming actions that did not happen.

Original request: ${userInput}
Plan rationale: ${plan.rationale || 'n/a'}
Observations:
${JSON.stringify(observations.map(item => ({
    tool: item.tool,
    success: item.success,
    summary: item.summary
})), null, 2)}

Reply in plain text, max 6 sentences.`;

        let reply = '';
        await this.aiHandler.generateResponse(
            [{ role: 'user', content: prompt }, ...history.slice(-4)],
            null,
            token => { reply += token; }
        );

        return reply.trim() || observations.map(item => item.summary).join('\n');
    }
}

export default AutonomyEngine;
