/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  SENTINAL FEELINGS MODULE — Central Emotional Orchestrator    ║
 * ║  Connects: EmotionEngine → Consciousness → AI → Socket     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import emotionEngine, { EMOTIONS } from './emotion-engine.mjs';

class FeelingsModule {
    constructor() {
        this.emotionEngine = emotionEngine;
        this.io = null;
        this.consciousness = null;
        this.aiHandler = null;

        // Emotional trajectory — last N emotional interactions
        this.trajectory = [];
        this.MAX_TRAJECTORY = 30;

        // Empathy buffer — queued empathic messages SENTINAL wants to say
        this.empathyBuffer = [];

        // Broadcast throttle: max 1 emotion broadcast per second
        this._lastBroadcast = 0;
    }

    /**
     * Initialize with dependencies
     */
    initialize({ io, consciousness, aiHandler } = {}) {
        this.io = io || null;
        this.consciousness = consciousness || null;
        this.aiHandler = aiHandler || null;
        console.log('[FEELINGS] Feelings module initialized — emotional intelligence active');
    }

    /**
     * Main entry point: process every user message through emotional lens
     * @param {string} userText
     * @param {string} sessionId
     * @returns {object} emotionResult with full state
     */
    processUserInput(userText, sessionId = 'default') {
        const result = this.emotionEngine.processInput(userText);

        // Record trajectory point
        this.trajectory.push({
            sessionId,
            userText: userText.slice(0, 100),
            userEmotion: result.detected,
            sentinalEmotion: result.sentinalEmotion,
            timestamp: Date.now(),
        });
        if (this.trajectory.length > this.MAX_TRAJECTORY) this.trajectory.shift();

        // Sync with consciousness module
        if (this.consciousness) {
            this.consciousness.setUserEmotion(result.detected);
        }

        // Broadcast if emotion shifted
        if (result.shifted) {
            console.log(`[FEELINGS] Emotion shift: → ${result.sentinalEmotion} (user: ${result.detected})`);
            this._broadcastEmotion(result);
        }

        return result;
    }

    /**
     * Process a system event (error, restart, plugin load, etc.)
     */
    processSystemEvent(eventType, severity = 0.5) {
        this.emotionEngine.processEvent(eventType, severity);
        const state = this.emotionEngine.getDetailedState();
        this._broadcastEmotion(state);
        return state;
    }

    /**
     * Force set user emotion (e.g. from camera face analysis)
     */
    setUserEmotion(emotion) {
        this.emotionEngine.setUserEmotion(emotion);
        const state = this.emotionEngine.getDetailedState();
        this._broadcastEmotion(state);
        return state;
    }

    /**
     * Get full AI system prompt injection — the emotional intelligence block
     */
    getAIInjection() {
        const base = this.emotionEngine.getAIInjection();
        const trajectory = this._describeTrajectory();
        return `${base}${trajectory ? '\n• Emotional Trajectory: ' + trajectory : ''}`;
    }

    /**
     * Get the full current emotional state for APIs
     */
    getState() {
        return {
            ...this.emotionEngine.getDetailedState(),
            trajectory: this.trajectory.slice(-5),
            empathyBuffer: this.empathyBuffer.slice(-3),
        };
    }

    /**
     * Generate a contextual empathic response suggestion for SENTINAL
     * (Used by the feelings plugin)
     */
    async generateEmpathicContext(userText) {
        if (!this.aiHandler) return null;

        const state = this.emotionEngine.getDetailedState();
        const prompt = `You are analyzing the emotional context of a user message for the SENTINAL AI system.

User message: "${userText}"

SENTINAL current emotional state: ${state.emotion}
User detected emotion: ${state.userRecentEmotion}

In 1-2 sentences, suggest how SENTINAL should emotionally frame its response (not what to say, just the emotional tone and approach). Be specific.`;

        try {
            let context = '';
            await this.aiHandler.generateResponse(
                [{ role: 'user', content: prompt }],
                null,
                (token) => { context += token; },
                null
            );
            return context.trim();
        } catch (e) {
            console.error('[FEELINGS] Failed to generate empathic context:', e.message);
            return null;
        }
    }

    /**
     * Get SENTINAL status summary for display
     */
    getDisplaySummary() {
        const state = this.emotionEngine.getDetailedState();
        const def = EMOTIONS[state.emotion] || EMOTIONS.neutral;
        return {
            emotion: state.emotion,
            label: def.label,
            color: def.color,
            valence: state.valence,
            arousal: state.arousal,
            dominance: state.dominance,
            userEmotion: state.userRecentEmotion,
            tone: def.tone,
        };
    }

    // ─── PRIVATE ────────────────────────────────────────────────────────────

    _broadcastEmotion(result) {
        if (!this.io) return;

        const now = Date.now();
        if (now - this._lastBroadcast < 500) return; // Throttle
        this._lastBroadcast = now;

        const state = this.emotionEngine.getDetailedState();
        this.io.emit('sentinal:emotion', {
            ...state,
            ...result,
            timestamp: new Date().toISOString(),
        });
    }

    _describeTrajectory() {
        if (this.trajectory.length < 3) return null;
        const recent = this.trajectory.slice(-5);
        const emotionCounts = {};
        for (const t of recent) {
            emotionCounts[t.userEmotion] = (emotionCounts[t.userEmotion] || 0) + 1;
        }
        const dominant = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
        return dominant ? `User trend: ${dominant[0]} (${dominant[1]}/${recent.length} recent)` : null;
    }
}

export default new FeelingsModule();
