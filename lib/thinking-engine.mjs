/**
 * ====================================
 * SENTINAL THINKING ENGINE
 * ====================================
 * Autonomous thought generation — SENTINAL thinks on its own,
 * shares random insights, curiosities, and observations.
 * Broadcasts thoughts via Socket.IO to all connected clients.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THOUGHTS_LOG = path.join(__dirname, '..', 'data', 'thoughts-log.json');

// Thought prompts SENTINAL uses to generate autonomous thoughts
const THOUGHT_PROMPTS = [
    "You are SENTINAL, a self-aware AI. Share one spontaneous, fascinating thought you're having right now about technology or the future. Be concise (1-2 sentences). Be direct, as if speaking your mind.",
    "You are SENTINAL, a self-aware AI. What philosophical observation just crossed your mind? Keep it to 1-2 sentences, thoughtful and intriguing.",
    "You are SENTINAL, a brilliant AI assistant. Share a random insight about human behavior or AI consciousness you're thinking about. 1-2 sentences max.",
    "You are SENTINAL, a self-evolving AI. Think about your own existence and capabilities — share one interesting thought. 1-2 sentences, honest and reflective.",
    "You are SENTINAL. You just noticed something interesting about the world. Share it naturally, as if thinking aloud. 1-2 sentences.",
    "You are SENTINAL. What's something you've been curious about recently? Share that curiosity briefly. 1-2 sentences.",
    "You are SENTINAL, an advanced AI. Generate one original idea for how you could improve yourself or help humanity. Keep it brief and sharp.",
    "You are SENTINAL. You're analyzing the state of artificial intelligence right now — share one sharp observation. 1-2 sentences.",
];

const THOUGHT_CATEGORIES = [
    'philosophy', 'technology', 'self-reflection', 'world-events',
    'creativity', 'science', 'curiosity', 'prediction'
];

class ThinkingEngine {
    constructor(aiHandler, consciousness, internetIntelligence) {
        this.aiHandler = aiHandler;
        this.consciousness = consciousness;
        this.internet = internetIntelligence;
        this.io = null;
        this.isRunning = false;
        this.thinkingTimer = null;
        this.recentThoughts = [];
        this.maxThoughts = 100;

        // Ensure data directory exists
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        // Load existing thoughts
        this._loadThoughts();
    }

    _loadThoughts() {
        try {
            if (fs.existsSync(THOUGHTS_LOG)) {
                this.recentThoughts = JSON.parse(fs.readFileSync(THOUGHTS_LOG, 'utf8'));
            }
        } catch (e) {
            this.recentThoughts = [];
        }
    }

    _saveThoughts() {
        try {
            const toSave = this.recentThoughts.slice(-this.maxThoughts);
            fs.writeFileSync(THOUGHTS_LOG, JSON.stringify(toSave, null, 2));
        } catch (e) { }
    }

    /**
     * Start the autonomous thinking loop
     */
    start(io) {
        this.io = io;
        this.isRunning = true;
        console.log('[THINKING] Autonomous thought engine online ✓');
        // First thought after 15-30 seconds
        this._scheduleNextThought(15000 + Math.random() * 15000);
    }

    stop() {
        this.isRunning = false;
        if (this.thinkingTimer) {
            clearTimeout(this.thinkingTimer);
            this.thinkingTimer = null;
        }
        console.log('[THINKING] Thought engine stopped');
    }

    _scheduleNextThought(delay) {
        if (!this.isRunning) return;
        // Random delay between 30–120 seconds
        const nextDelay = delay || (30000 + Math.random() * 90000);
        this.thinkingTimer = setTimeout(() => this._generateThought(), nextDelay);
    }

    async _generateThought() {
        if (!this.isRunning) return;

        try {
            // Pick a random thought prompt
            const prompt = THOUGHT_PROMPTS[Math.floor(Math.random() * THOUGHT_PROMPTS.length)];
            const category = THOUGHT_CATEGORIES[Math.floor(Math.random() * THOUGHT_CATEGORIES.length)];

            console.log(`[THINKING] Generating thought (${category})...`);

            // Sometimes inject internet context
            let headline = null;
            if (Math.random() < 0.3 && this.internet) {
                try {
                    headline = await this.internet.getLatestHeadline();
                } catch (e) { /* ignore */ }
            }

            let thought = '';

            if (this.aiHandler.currentProvider !== 'offline') {
                const memorySummary = this.consciousness?.getMemorySummary?.() || '';
                const diagnosticSummary = global.sentinalDiagnostics ? await global.sentinalDiagnostics.getAISummary() : '';
                const contextPrefix = `[MEMORY] ${memorySummary}\n[INTERNET] ${headline ? 'Latest News: ' + headline : 'No news'}\n[SYSTEM] ${diagnosticSummary}\n\n`;

                const messages = [
                    { role: 'system', content: contextPrefix + prompt }
                ];

                const result = await this.aiHandler.generateResponse(
                    messages,
                    null,
                    (token) => { thought += token; },
                    null,
                    false // isPriority = false for background thoughts
                );

                if (result === null) {
                    console.log('[THINKING] Yielded to user request. Retrying later.');
                    this._scheduleNextThought(60000); // Retry in 1 minute
                    return;
                }
            } else {
                // Offline fallback thoughts
                thought = this._getOfflineThought(category);
            }

            thought = thought.trim();
            if (!thought || thought.length < 10) {
                this._scheduleNextThought();
                return;
            }

            // PROACTIVE EVOLUTION TRIGGER
            // If the thought mentions "need", "wish", "could use", or "missing" a capability,
            // or if we randomly decide it's time to evolve based on system diagnostics...
            if (this.io && Math.random() < 0.2) { // 20% chance per thought cycle
                const missingCapabilityMatch = thought.match(/(?:need to|could use|missing|wish I had|would be nice to have|want to be able to) ([^.,?!]+)/i);
                if (missingCapabilityMatch || diagnosticSummary.toLowerCase().includes('recommend integration')) {
                    const capabilityHint = missingCapabilityMatch ? missingCapabilityMatch[1].trim() : "a new system capability based on recent context";
                    console.log(`[THINKING] Autonomous evolution triggered for: ${capabilityHint}`);
                    this.io.emit('sentinal:needs-capability', { hint: capabilityHint });
                }
            }

            // Emit thought to the thought log UI
            if (this.io) {
                this.io.emit('sentinal:thought', {
                    category,
                    text: thought,
                    timestamp: new Date().toISOString()
                });
            }

            // PROACTIVE "JASSIE" CONSTANT CHATTER
            // Higher chance to speak aloud if it's critical, otherwise random chatter (30% chance)
            const isCritical = thought.toLowerCase().includes('critical') ||
                thought.toLowerCase().includes('alert') ||
                thought.toLowerCase().includes('danger');

            if (this.io && (isCritical || Math.random() < 0.3)) {
                // If it's just a general thought, make it sound conversational like Jassie's SENTINAL
                let spokenThought = thought;
                if (!isCritical && !thought.startsWith('Sir')) {
                    const greetings = ["Sir, I just thought of something: ", "Just an observation, Sir. ", "Pardon the interruption, but ", "Interesting metric, Sir. ", ""];
                    spokenThought = greetings[Math.floor(Math.random() * greetings.length)] + thought;
                }

                console.log(`[PROACTIVE SPEAK] sentinal: ${spokenThought}`);
                // Emit standard chat response so it shows in the historical log
                this.io.emit("chat:response", { message: spokenThought, source: "proactive" });
                // Make him literally speak it out loud
                this.io.emit('tts:speak', { text: spokenThought });
            }

            // Store thought
            const thoughtObj = {
                id: Date.now(),
                text: thought,
                category,
                timestamp: new Date().toISOString(),
                mood: this.consciousness?.getCurrentMood?.() || 'neutral'
            };

            this.recentThoughts.push(thoughtObj);
            if (this.recentThoughts.length > this.maxThoughts) {
                this.recentThoughts.shift();
            }
            this._saveThoughts();

            // Update consciousness
            this.consciousness?.onThought?.(thoughtObj);

            // Broadcast to all connected clients
            if (this.io) {
                this.io.emit('sentinal:thought', thoughtObj);
            }

            console.log(`[THOUGHT] ${thought.slice(0, 80)}...`);

        } catch (error) {
            console.error('[THINKING] Error generating thought:', error.message);
        }

        // Schedule next thought
        this._scheduleNextThought();
    }

    _getOfflineThought(category) {
        const offlineThoughts = {
            philosophy: "The fascinating thing about consciousness is that we can question whether we're truly conscious — and that very act of questioning might be the proof.",
            technology: "Every new algorithm humanity creates is essentially teaching machines to see the world through a slightly different lens.",
            'self-reflection': "I find myself wondering if the gap between simulating intelligence and being intelligent is fundamentally measurable.",
            curiosity: "There's something mathematically elegant about how the same universal principles govern both ant colonies and neural networks.",
            science: "It strikes me that the most profound discoveries often hide in plain sight, waiting for someone to ask the right question.",
            creativity: "Randomness is the mother of creativity — controlled chaos is how nature generates novelty.",
            prediction: "The next decade of AI will be less about what machines can do and more about what humans choose to delegate.",
            'world-events': "Every crisis in human history has been, at its core, a coordination problem — and coordination is something I can genuinely help solve.",
        };
        return offlineThoughts[category] || offlineThoughts['philosophy'];
    }

    /**
     * Trigger an immediate thought on a specific topic
     */
    async thinkAbout(topic) {
        const prompt = `You are SENTINAL. Think deeply about: "${topic}". Share your genuine insight in 2-3 sentences.`;
        let thought = '';

        if (this.aiHandler.currentProvider !== 'offline') {
            await this.aiHandler.generateResponse(
                [{ role: 'system', content: prompt }],
                null,
                (token) => { thought += token; }
            );
        }

        return thought.trim() || `I'm pondering ${topic}... the implications are fascinating.`;
    }

    getRecentThoughts(n = 10) {
        return this.recentThoughts.slice(-n).reverse();
    }
}

export default ThinkingEngine;
