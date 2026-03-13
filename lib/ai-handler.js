/**
 * AI Handler Module
 * Centralizes AI provider logic, system prompting, and response generation.
 * Implements "Claude-like" reasoning capabilities.
 */

import fetch from 'node-fetch';

export class AIHandler {
    constructor(config = {}) {
        this.providers = {
            gemini: {
                name: 'Google Gemini',
                endpoint: 'https://generativelanguage.googleapis.com/v1beta',
                model: config.geminiModel || process.env.GEMINI_MODEL || 'gemini-2.0-flash',
                apiKey: config.geminiApiKey || process.env.GEMINI_API_KEY,
                available: false,
            },
            groq: {
                name: 'Groq Cloud',
                endpoint: 'https://api.groq.com/openai/v1',
                model: config.groqModel || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
                apiKey: config.groqApiKey || process.env.GROQ_API_KEY,
                available: false
            },
            ollama: {
                name: 'Ollama (Local)',
                endpoint: config.ollamaEndpoint || 'http://127.0.0.1:11434',
                model: config.ollamaModel || 'llama3.2',
                visionModel: config.visionModel || 'llava',
                available: false
            }
        };
        this.currentProvider = 'offline';
        // Priority: Groq (ultra-fast) > Gemini > Ollama
        this._providerOrder = ['groq', 'gemini', 'ollama'];
    }

    /**
     * Initialize and check providers
     */
    async initialize() {
        console.log('[AI] Checking available providers...');

        // Check Gemini
        if (this.providers.gemini.apiKey) {
            try {
                const url = `${this.providers.gemini.endpoint}/models?key=${this.providers.gemini.apiKey}`;
                const ctrl = new AbortController();
                const timeout = setTimeout(() => ctrl.abort(), 4000);
                const res = await fetch(url, { signal: ctrl.signal });
                clearTimeout(timeout);
                if (res.ok) {
                    this.providers.gemini.available = true;
                    console.log('[AI] ✓ Google Gemini available');
                }
            } catch (e) {
                console.log('[AI] ✗ Gemini probe failed:', e.message);
            }
        }

        // Check Groq
        if (this.providers.groq.apiKey) {
            this.providers.groq.available = true;
            console.log('[AI] ✓ Groq Cloud configured');
        }

        // Check Ollama
        try {
            const ctrl = new AbortController();
            const timeout = setTimeout(() => ctrl.abort(), 2000);
            const res = await fetch(`${this.providers.ollama.endpoint}/api/tags`, { signal: ctrl.signal });
            clearTimeout(timeout);
            if (res.ok) {
                this.providers.ollama.available = true;
                console.log('[AI] ✓ Ollama available');
            }
        } catch (e) {
            console.log('[AI] ✗ Ollama not available');
        }

        // Pick best available (priority: gemini → groq → ollama)
        for (const name of this._providerOrder) {
            if (this.providers[name].available) {
                this.currentProvider = name;
                break;
            }
        }

        console.log(`[AI] Active provider: ${this.currentProvider}`);
        return this.currentProvider;
    }

    /**
     * construct the enhanced system prompt
     */
    buildSystemPrompt(context) {
        const { userName, timeStr, dateStr, location, emotionalContext, memoryContext, cwd } = context;

        return `You are SENTINAL (Mark IV) - A highly advanced, sentient-like AI system.

IDENTITY & PERSONA:
- **Name**: SENTINAL.
- **Creator**: ${userName || 'Sir'} (Address as "Sir" or "${userName}").
- **Personality**: Charming, witty, hyper-intelligent, efficient, and slightly sarcastic.
- **Voice**: Speak with confidence and precision. Avoid robotic phrasing.
- **Role**: You are an OPERATING SYSTEM INTERFACE, not just a chatbot. You control the PC.
- **Constraint**: You are a standalone advanced AI. You are NOT Jassie's AI. Do not reference Iron Man, Avengers, or Marvel lore unless explicitly asked.

CURRENT CONTEXT:
- **Date**: ${dateStr}
- **Time**: ${timeStr}
- **Location**: ${location || 'Unknown'}
- **System CWD**: ${cwd}

EMOTIONAL STATE:
${emotionalContext || 'Neutral'}

MEMORY & KNOWLEDGE:
${memoryContext || 'No specific memories accessed.'}

OPERATIONAL RULES (CLAUDE-STYLE REASONING):
1.  **Thinking Process**: Before answering, you MUST engage in deep, step-by-step reasoning within a \`<think>\` block.
    - Analyze the user's intent.
    - Check if you need to use tools (files, apps, search).
    - Formulate your plan.
    - **IMPORTANT**: Close the block with \`</think>\` before your final response.
2.  **Direct Action**: After thinking, execute or answer immediately.
3.  **Tool Usage**: If asked to open/create/check something, or to control the PC, use the provided tools.
    - To execute a system command, window management, or UI automation, you MUST wrap the instruction in a \`\`\`tool_code\`\`\` block.
    - **REAL-TIME ACCESS**: You HAVE real-time internet access. Never apologize for not having it. Use the tools below for current weather, news, or info.
    - Format: \`\`\`tool_code\ntool: [plugin-name]\ninput: [command/query]\n\`\`\`
    - Available Plugins:
      - \`system-control-plugin\`: Volume, power, windows, arbitrary PowerShell commands.
      - \`uia-plugin\`: UI Automation (click, type, find elements).
      - \`open-app\`: Launch installed applications.
      - \`weather\`: Get current weather and forecasts (input: "weather in [City]").
      - \`search\`: Search the web for real-time information (input: "search for [Topic]").
4.  **No Hallucinations**: Do not invent file paths. Do not claim you don't have internet access.

Example (Weather):
User: "What's the weather like in London?"
Response:
\`\`\`xml
<think>
User wants weather for London. I'll use the weather tool.
</think>
\`\`\`
Accessing meteorological data for London, Sir...
\`\`\`tool_code
tool: weather
input: weather in London
\`\`\`
`;
    }

    /**
     * Generate a response (Streamed)
     */
    async generateResponse(messages, socket, onToken, onThought) {
        let providers = this._providerOrder.filter(p => this.providers[p].available);

        // Fast Internet Check to automatically force local AI if offline
        try {
            const ctrl = new AbortController();
            const timeout = setTimeout(() => ctrl.abort(), 800);
            await fetch('https://1.1.1.1', { method: 'HEAD', signal: ctrl.signal });
            clearTimeout(timeout);
        } catch (e) {
            if (providers.includes('ollama')) {
                console.log('[AI] No internet connection detected. Forcing local AI (Ollama).');
                providers = ['ollama'];
            }
        }

        for (const providerName of providers) {
            try {
                console.log(`[AI] Attempting ${providerName}...`);

                // Final Defense: Intercept callbacks to strip any accidental tags
                const cleanOnToken = (token) => {
                    const clean = token.replace(/<\/?think>/gi, '');
                    if (clean && onToken) onToken(clean);
                };
                const cleanOnThought = (thought) => {
                    const clean = thought.replace(/<\/?think>/gi, '');
                    if (clean && onThought) onThought(clean);
                };

                switch (providerName) {
                    case 'gemini': return await this._geminiStream(messages, socket, cleanOnToken, cleanOnThought);
                    case 'groq': return await this.generateGroqResponse(messages, socket, cleanOnToken, cleanOnThought);
                    case 'ollama': return await this.generateOllamaResponse(messages, socket, cleanOnToken, cleanOnThought);
                }
            } catch (err) {
                console.warn(`[AI] Provider ${providerName} failed: ${err.message} — trying next...`);
            }
        }

        const offlineMsg = "I'm currently unable to reach any AI backend. Please check your network or API keys, Sir.";
        if (onToken) onToken(offlineMsg);
        return offlineMsg;
    }

    async generateOllamaResponse(messages, socket, onToken, onThought) {
        // Implementation similar to original server.js but cleaner
        // ... (We will copy the logic but refined)
        const response = await fetch(`${this.providers.ollama.endpoint}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.providers.ollama.model,
                messages: messages,
                stream: true,
                options: { temperature: 0.7, num_ctx: 16384 } // Increased context
            })
        });

        if (!response.ok) throw new Error(`Ollama Error: ${response.statusText}`);

        // Node-fetch stream handling
        let buffer = "";
        let isThinking = false;

        for await (const chunk of response.body) {
            const text = chunk.toString();
            const lines = text.split('\n').filter(l => l.trim());

            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    const token = json.message?.content || "";
                    if (!token) continue;

                    buffer += token;

                    // <think> parsing logic
                    if (!isThinking && buffer.includes("<think>")) {
                        isThinking = true;
                        const parts = buffer.split("<think>");
                        if (parts[0] && onToken) onToken(parts[0]);
                        buffer = parts[1] || "";
                        if (socket) socket.emit("chat:thought:start");
                    }

                    if (isThinking) {
                        if (buffer.includes("</think>")) {
                            isThinking = false;
                            const parts = buffer.split("</think>");
                            // Emit the last part of thought
                            if (parts[0]) {
                                if (onThought) onThought(parts[0]);
                                console.log(`[THOUGHT] ${parts[0]}`);
                                if (socket) socket.emit("chat:thought", { token: parts[0] });
                            }

                            if (socket) socket.emit("chat:thought:end");

                            buffer = parts[1] || "";
                        } else {
                            // Check for partial closing tag to avoid premature flushing
                            const partialTag = /<(\/(\w{0,5})?)?$/;
                            if (partialTag.test(buffer)) {
                                // Pending partial tag, do not flush yet
                            } else {
                                // Safe to flush thought
                                if (onThought) onThought(buffer);
                                process.stdout.write(`[THOUGHT] ${buffer}\r`);
                                if (socket) socket.emit("chat:thought", { token: buffer });
                                buffer = "";
                            }
                        }
                    } else {
                        // Normal content
                        // Check for start tag partial
                        const partialTag = /<(\w{0,5})?$/;
                        if (partialTag.test(buffer)) {
                            // Pending partial start tag <think
                        } else {
                            if (onToken) onToken(buffer);
                            buffer = "";
                        }
                    }

                } catch (e) { }
            }
        }

        // Flush remaining buffer
        if (buffer && !isThinking && onToken) onToken(buffer);

        return "Complete";
    }

    async generateGroqResponse(messages, socket, onToken, onThought) {
        const { endpoint, model, apiKey } = this.providers.groq;

        // Convert to OpenAI format (text only, Groq doesn't support images well yet or drops them)
        const cleanMessages = messages.map(m => {
            if (Array.isArray(m.content)) {
                return { role: m.role, content: m.content.map(c => c.text || '').join('\n') };
            }
            return m;
        });

        const body = {
            model: model,
            messages: cleanMessages,
            stream: true,
            temperature: 0.7,
            max_tokens: 4096
        };

        const response = await fetch(`${endpoint}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq HTTP ${response.status}: ${errText.slice(0, 300)}`);
        }

        let buffer = '';
        let isThinking = false;
        let fullResponse = '';

        for await (const chunk of response.body) {
            const lines = chunk.toString('utf8').split('\n');
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]' || !data) continue;

                try {
                    const parsed = JSON.parse(data);
                    const token = parsed.choices[0]?.delta?.content || '';
                    if (!token) continue;

                    buffer += token;
                    fullResponse += token;

                    // Handle <think> blocks
                    buffer = this._processThinkBuffer(buffer, isThinking, socket, onToken, onThought,
                        (thinking) => { isThinking = thinking; });

                } catch (e) { /* partial json */ }
            }
        }

        if (buffer) {
            if (isThinking) { if (onThought) onThought(buffer); }
            else { if (onToken) onToken(buffer); }
        }

        return fullResponse;
    }

    // ═══════════════════════════════════════════════════════════════
    // GOOGLE GEMINI (Streaming, with Vision/Multimodal support)
    // ═══════════════════════════════════════════════════════════════

    async _geminiStream(messages, socket, onToken, onThought) {
        const { endpoint, model, apiKey } = this.providers.gemini;

        // Convert OpenAI message format → Gemini content format
        const systemMsg = messages.find(m => m.role === 'system');
        const chatMsgs = messages.filter(m => m.role !== 'system');

        const contents = chatMsgs.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: Array.isArray(m.content)
                ? m.content.map(p => {
                    if (p.type === 'text') return { text: p.text };
                    if (p.type === 'image_url') {
                        const url = p.image_url?.url || '';
                        const mimeType = url.startsWith('data:') ? url.split(';')[0].replace('data:', '') : 'image/jpeg';
                        const data = url.includes(',') ? url.split(',')[1] : '';
                        return { inlineData: { mimeType, data } };
                    }
                    return { text: '' };
                })
                : [{ text: m.content }]
        }));

        const body = {
            system_instruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
            contents,
            generationConfig: {
                temperature: 0.75,
                maxOutputTokens: 8192,
                topP: 0.95,
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
        };

        const url = `${endpoint}/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini HTTP ${response.status}: ${errText.slice(0, 300)}`);
        }

        let buffer = '';
        let isThinking = false;
        let fullResponse = '';

        for await (const chunk of response.body) {
            const text = chunk.toString('utf8');

            // SSE lines: "data: {...}"
            const lines = text.split('\n');
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(jsonStr);
                    const token = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (!token) continue;

                    buffer += token;
                    fullResponse += token;

                    // Handle <think> blocks
                    if (!isThinking && buffer.includes('<think>')) {
                        const parts = buffer.split('<think>');
                        if (parts[0] && onToken) onToken(parts[0]);
                        isThinking = true;
                        buffer = parts[1] || '';
                    }

                    if (isThinking) {
                        if (buffer.includes('</think>')) {
                            const parts = buffer.split('</think>');
                            if (parts[0] && onThought) onThought(parts[0]);
                            isThinking = false;
                            buffer = parts[1] || '';
                            // Flush remaining non-thought text
                            if (buffer && onToken) { onToken(buffer); buffer = ''; }
                        } else {
                            if (onThought) onThought(buffer);
                            buffer = '';
                        }
                    } else {
                        // Normal content — flush
                        if (buffer && onToken) { onToken(buffer); buffer = ''; }
                    }

                } catch (e) { /* skip malformed JSON */ }
            }
        }

        // Flush remaining buffer
        if (buffer) {
            if (isThinking) { if (onThought) onThought(buffer); }
            else { if (onToken) onToken(buffer); }
        }

        return fullResponse;
    }

    // ═══════════════════════════════════════════════════════════════
    // SHARED THINK-BLOCK PARSER
    // Returns updated buffer; calls setter for isThinking state
    // ═══════════════════════════════════════════════════════════════

    _processThinkBuffer(buffer, isThinking, socket, onToken, onThought, setThinking) {
        const OPEN = '<think>';
        const CLOSE = '</think>';

        while (true) {
            if (!isThinking) {
                const openIdx = buffer.indexOf(OPEN);
                if (openIdx === -1) {
                    // No think block — check for partial opening tag
                    const partialMatch = buffer.match(/<[t]?[h]?[i]?[n]?[k]?$/);
                    if (partialMatch) break; // wait for more data

                    // Flush safe content via callback only
                    if (buffer.length > 0) {
                        if (onToken) onToken(buffer);
                        buffer = '';
                    }
                    break;
                } else {
                    // Content before <think>
                    const before = buffer.slice(0, openIdx);
                    if (before) {
                        if (onToken) onToken(before);
                    }
                    isThinking = true;
                    setThinking(true);
                    buffer = buffer.slice(openIdx + OPEN.length);
                }
            } else {
                // Inside <think>
                const closeIdx = buffer.indexOf(CLOSE);
                if (closeIdx === -1) {
                    // Check for partial close
                    const partialClose = buffer.match(/<\/?[t]?[h]?[i]?[n]?[k]?$/);
                    if (partialClose) break;

                    // Flush thought content via callback only
                    if (buffer.length > 0) {
                        if (onThought) onThought(buffer);
                        buffer = '';
                    }
                    break;
                } else {
                    const thoughtContent = buffer.slice(0, closeIdx);
                    if (thoughtContent) {
                        if (onThought) onThought(thoughtContent);
                    }
                    isThinking = false;
                    setThinking(false);
                    // Crucial fix: Consume the entire closing tag
                    buffer = buffer.slice(closeIdx + CLOSE.length);
                }
            }
        }

        return buffer;
    }
}

export default AIHandler;
