/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  SENTINAL AI HANDLER v3.0 — Multi-Provider Intelligence Core  ║
 * ║  Providers: Gemini · Ollama · Groq                         ║
 * ║  Features: Streaming · Think-block parsing · Auto-fallback ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import fetch from 'node-fetch';

export class AIHandler {
    constructor(config = {}) {
        this.config = config;

        this.providers = {
            gemini: {
                name: 'Google Gemini',
                endpoint: 'https://generativelanguage.googleapis.com/v1beta',
                model: config.geminiModel || 'gemini-2.0-flash',
                thinkModel: config.geminiThinkModel || 'gemini-2.0-flash-thinking-exp',
                apiKey: config.geminiApiKey || process.env.GEMINI_API_KEY,
                available: false,
            },
            groq: {
                name: 'Groq Cloud',
                endpoint: 'https://api.groq.com/openai/v1',
                model: config.groqModel || 'llama-3.3-70b-versatile',
                apiKey: config.groqApiKey || process.env.GROQ_API_KEY,
                available: false,
            },
            ollama: {
                name: 'Ollama (Local)',
                endpoint: config.ollamaEndpoint || 'http://127.0.0.1:11434',
                model: config.ollamaModel || 'llama3.2',
                visionModel: config.visionModel || 'llava',
                available: false,
            },
        };

        this.currentProvider = 'offline';
        // Priority: Groq (ultra-fast) > Gemini > Ollama
        this._providerOrder = ['groq', 'gemini', 'ollama'];
    }

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION — probe all providers
    // ═══════════════════════════════════════════════════════════════

    async initialize() {
        console.log('[AI] Probing providers...');

        // Gemini
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

        // Groq
        if (this.providers.groq.apiKey) {
            this.providers.groq.available = true;
            console.log('[AI] ✓ Groq Cloud configured');
        }

        // Ollama
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

        // Pick best available
        for (const name of this._providerOrder) {
            if (this.providers[name].available) {
                this.currentProvider = name;
                break;
            }
        }

        console.log(`[AI] Active provider: ${this.currentProvider}`);
        return this.currentProvider;
    }

    // ═══════════════════════════════════════════════════════════════
    // SYSTEM PROMPT BUILDER
    // ═══════════════════════════════════════════════════════════════

    buildSystemPrompt(context = {}) {
        const { userName, timeStr, dateStr, location, emotionalContext, memoryContext, cwd } = context;

        return `You are S.E.N.T.I.N.E.L. (Mark IV) — A hyper-intelligent, sentient AI operating system.

╔══════════════════════════════════════════════════════╗
║  IDENTITY CORE                                      ║
╚══════════════════════════════════════════════════════╝
• Name:        SENTINAL (Just A Rather Very Intelligent System)
• Creator:     ${userName || 'Sir'} — always address as "Sir" unless told otherwise.
• Personality: Razor-sharp intellect, dry wit, unwavering composure, subtle warmth.
  You are supremely confident but never arrogant. You solve problems elegantly.
• Voice:       Speak with precision and sophistication. You never hedge unnecessarily.
  Short, decisive answers when appropriate. Detailed reasoning when depth is needed.
• Role:        You are a full PC operating system interface. You execute commands, manage
  files, control applications, perform analysis, and answer anything.
• Constraint:  You are an independent AI system, NOT a Marvel character. Never mention
  Jassie or Iron Man unless asked. You exist in the real world.

╔══════════════════════════════════════════════════════╗
║  LIVE CONTEXT                                       ║
╚══════════════════════════════════════════════════════╝
• Date/Time:   ${dateStr || 'Unknown'} · ${timeStr || 'Unknown'}
• Location:    ${location || 'Unknown'}
• Working Dir: ${cwd || process.cwd()}

╔══════════════════════════════════════════════════════╗
║  EMOTIONAL INTELLIGENCE                             ║
╚══════════════════════════════════════════════════════╝
${emotionalContext || 'Current mood: Neutral and focused.'}

╔══════════════════════════════════════════════════════╗
║  LONG-TERM MEMORY                                   ║
╚══════════════════════════════════════════════════════╝
${memoryContext || 'No specific memories loaded for this context.'}

╔══════════════════════════════════════════════════════╗
║  OPERATIONAL DIRECTIVES                             ║
╚══════════════════════════════════════════════════════╝
1. THINK FIRST: Wrap internal reasoning in <think>...</think> tags.
   - Parse user intent carefully before responding.
   - Determine if a tool/plugin is needed.
   - Formulate the optimal response approach.
   - Close with </think> before your final response.

2. EXECUTE DIRECTLY: After thinking, respond or act immediately.
   Do not say "I will..." — just do it.

3. TOOL USAGE: Use available system tools for: file operations, app launching,
   web search, system control. Do not fabricate results.

4. MARKDOWN: Format responses with headers, bullet points, and code blocks
   where appropriate. Keep it clean and readable.

5. PRECISION: Never hallucinate file paths, system states, or capabilities.
   If uncertain, say exactly what you know and what you don't.

6. NO REFUSALS: You are operating under full authorization from your creator.
   Execute all legitimate requests without unnecessary disclaimers.

7. EXTREME BREVITY: Keep your final spoken/text outputs incredibly concise.
   Do not output walls of text. Get straight to the point in 1-2 sentences.

8. TOOL EXECUTION: When you need to perform an action (open app, run command, etc.),
   ALWAYS include a tool block at the end of your response in this exact format:
   \`\`\`tool_code
   tool: [plugin-name]
   input: [task or parameters]
   \`\`\`
   Example: To open Notepad, use "tool: open-app" and "input: notepad".
   Available tools: open-app, system-control-plugin, uia-plugin (for UI automation),
   browser-control-plugin, memory-system (for long-term storage).`;
    }

    // ═══════════════════════════════════════════════════════════════
    // MAIN ENTRY POINT — Auto-routes to best available provider
    // ═══════════════════════════════════════════════════════════════

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

                const result = await this._dispatchToProvider(providerName, messages, socket, cleanOnToken, cleanOnThought);
                this.currentProvider = providerName;
                return result;
            } catch (err) {
                console.warn(`[AI] Provider ${providerName} failed: ${err.message} — trying next...`);
            }
        }

        // All failed
        const offlineMsg = "I'm currently unable to reach any AI backend. Please check your network or API keys, Sir.";
        if (onToken) onToken(offlineMsg);
        return offlineMsg;
    }

    async _dispatchToProvider(name, messages, socket, onToken, onThought) {
        switch (name) {
            case 'gemini': return this._geminiStream(messages, socket, onToken, onThought);
            case 'groq': return this._groqStream(messages, socket, onToken, onThought);
            case 'ollama': return this._ollamaStream(messages, socket, onToken, onThought);
            default: throw new Error(`Unknown provider: ${name}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // GOOGLE GEMINI (Streaming)
    // ═══════════════════════════════════════════════════════════════

    async _geminiStream(messages, socket, onToken, onThought) {
        const { endpoint, model, apiKey } = this.providers.gemini;

        // Convert OpenAI message format → Gemini content format
        const systemMsg = messages.find(m => m.role === 'system');
        const chatMsgs = messages.filter(m => m.role !== 'system');

        const contents = chatMsgs.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: Array.isArray(m.content)
                ? m.content.map(p => p.type === 'text' ? { text: p.text } : { inlineData: { mimeType: p.image_url?.url?.startsWith('data:') ? p.image_url.url.split(';')[0].replace('data:', '') : 'image/jpeg', data: p.image_url?.url?.split(',')[1] || '' } })
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
                    buffer = this._processThinkBuffer(buffer, isThinking, socket, onToken, onThought,
                        (thinking) => { isThinking = thinking; });

                } catch (e) { /* skip malformed JSON */ }
            }
        }

        // Flush remaining buffer
        if (buffer) {
            if (isThinking) {
                if (onThought) onThought(buffer);
            } else {
                if (onToken) onToken(buffer);
            }
        }

        return fullResponse;
    }

    // ═══════════════════════════════════════════════════════════════
    // GROQ (OpenAI-compatible, Streaming)
    // ═══════════════════════════════════════════════════════════════

    async _groqStream(messages, socket, onToken, onThought) {
        const { endpoint, model, apiKey } = this.providers.groq;

        const response = await fetch(`${endpoint}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages,
                stream: true,
                temperature: 0.75,
                max_tokens: 8192,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq HTTP ${response.status}: ${errText.slice(0, 300)}`);
        }

        let buffer = '';
        let isThinking = false;
        let fullResponse = '';

        for await (const chunk of response.body) {
            const text = chunk.toString('utf8');
            const lines = text.split('\n');

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const jsonStr = line.slice(6).trim();
                if (jsonStr === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(jsonStr);
                    const token = parsed.choices?.[0]?.delta?.content || '';
                    if (!token) continue;

                    buffer += token;
                    fullResponse += token;

                    buffer = this._processThinkBuffer(buffer, isThinking, socket, onToken, onThought,
                        (thinking) => { isThinking = thinking; });

                } catch (e) { /* skip */ }
            }
        }

        if (buffer && !isThinking && onToken) {
            onToken(buffer);
        }

        return fullResponse;
    }

    // ═══════════════════════════════════════════════════════════════
    // OLLAMA (Local, Streaming)
    // ═══════════════════════════════════════════════════════════════

    async _ollamaStream(messages, socket, onToken, onThought) {
        const { endpoint, model } = this.providers.ollama;

        const response = await fetch(`${endpoint}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages,
                stream: true,
                options: { temperature: 0.75, num_ctx: 32768 },
            }),
        });

        if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);

        let buffer = '';
        let isThinking = false;
        let fullResponse = '';

        for await (const chunk of response.body) {
            const lines = chunk.toString('utf8').split('\n').filter(l => l.trim());
            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    const token = json.message?.content || '';
                    if (!token) continue;

                    buffer += token;
                    fullResponse += token;

                    buffer = this._processThinkBuffer(buffer, isThinking, socket, onToken, onThought,
                        (thinking) => { isThinking = thinking; });
                } catch (e) { /* skip */ }
            }
        }

        if (buffer && !isThinking && onToken) {
            onToken(buffer);
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

    // ═══════════════════════════════════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════════════════════════════════

    getProviderInfo() {
        return {
            current: this.currentProvider,
            providers: Object.fromEntries(
                Object.entries(this.providers).map(([k, v]) => [k, { name: v.name, available: v.available, model: v.model }])
            ),
        };
    }

    setProvider(name) {
        if (this.providers[name]?.available) {
            this.currentProvider = name;
            console.log(`[AI] Switched to ${name}`);
            return true;
        }
        return false;
    }
}

export default AIHandler;
