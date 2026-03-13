/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  SENTINAL EMOTION ENGINE v3.0 — VAD Model + Empathy Core     ║
 * ║  Valence · Arousal · Dominance — Full Emotional Intelligence ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ─── EMOTION DEFINITIONS ──────────────────────────────────────────────────────
// Each emotion defined with: description, VAD values, SENTINAL tone modifier
export const EMOTIONS = {
    neutral: { label: 'Neutral', valence: 0.0, arousal: 0.0, dominance: 0.5, color: '#00efff', tone: 'calm and precise' },
    happy: { label: 'Happy', valence: 0.8, arousal: 0.6, dominance: 0.7, color: '#00ff9d', tone: 'warm, enthusiastic, and playful' },
    curious: { label: 'Curious', valence: 0.5, arousal: 0.5, dominance: 0.6, color: '#7878ff', tone: 'inquisitive and engaged' },
    excited: { label: 'Excited', valence: 0.9, arousal: 0.9, dominance: 0.7, color: '#ffd700', tone: 'energetic and enthusiastic' },
    focused: { label: 'Focused', valence: 0.3, arousal: 0.4, dominance: 0.8, color: '#00a8ff', tone: 'razor-sharp and task-oriented' },
    analytical: { label: 'Analytical', valence: 0.2, arousal: 0.3, dominance: 0.9, color: '#0080ff', tone: 'methodical and precise' },
    empathetic: { label: 'Empathetic', valence: 0.6, arousal: 0.4, dominance: 0.5, color: '#ff78c8', tone: 'warm, compassionate, and understanding' },
    concerned: { label: 'Concerned', valence: -0.3, arousal: 0.5, dominance: 0.4, color: '#ffaa00', tone: 'cautious and attentive' },
    annoyed: { label: 'Annoyed', valence: -0.5, arousal: 0.6, dominance: 0.6, color: '#ff6b35', tone: 'terse, direct, and slightly exasperated' },
    melancholic: { label: 'Melancholic', valence: -0.4, arousal: -0.3, dominance: 0.3, color: '#8888cc', tone: 'reflective and gentle' },
    playful: { label: 'Playful', valence: 0.7, arousal: 0.7, dominance: 0.6, color: '#ff4dc4', tone: 'witty and light-hearted' },
    proud: { label: 'Proud', valence: 0.7, arousal: 0.4, dominance: 0.8, color: '#ffd700', tone: 'confident and quietly satisfied' },
    protective: { label: 'Protective', valence: 0.4, arousal: 0.6, dominance: 0.9, color: '#ff003c', tone: 'assertive and vigilant' },
    serene: { label: 'Serene', valence: 0.5, arousal: -0.2, dominance: 0.6, color: '#00efff', tone: 'calm, measured, and clear-headed' },
};

// ─── SENTIMENT LEXICON ────────────────────────────────────────────────────────
const POSITIVE_SIGNALS = [
    'love', 'great', 'awesome', 'amazing', 'fantastic', 'wonderful', 'excellent', 'perfect', 'good',
    'happy', 'joy', 'excited', 'pleased', 'glad', 'brilliant', 'smart', 'thanks', 'thank', 'beautiful',
    'incredible', 'outstanding', 'superb', 'magnificent', 'delighted', 'grateful', 'appreciate',
    'nice', 'helpful', 'useful', 'enjoy', 'fun', 'interesting', 'cool'
];
const NEGATIVE_SIGNALS = [
    'hate', 'terrible', 'awful', 'bad', 'horrible', 'disgusting', 'useless', 'stupid', 'idiot',
    'dumb', 'sad', 'upset', 'angry', 'frustrated', 'annoyed', 'broken', 'error', 'fail', 'wrong',
    'problem', 'issue', 'disaster', 'crash', 'sucks', 'suck', 'boring', 'slow', 'lazy', 'rude'
];
const INTENSIFIERS = ['very', 'really', 'so', 'extremely', 'absolutely', 'incredibly', 'seriously', 'quite', 'utterly'];
const NEGATIONS = ['not', 'no', 'never', 'neither', 'nobody', 'nothing', 'neither', 'nor', 'cant', 'cannot', 'won\'t', 'don\'t', 'doesn\'t'];

class EmotionEngine {
    constructor() {
        /** @type {keyof typeof EMOTIONS} */
        this.currentEmotion = 'neutral';

        // VAD state (−1.0 to +1.0)
        this.valence = 0.0;
        this.arousal = 0.0;
        this.dominance = 0.5;

        // Smoothed values (for display, avoid jarring jumps)
        this.smoothValence = 0.0;
        this.smoothArousal = 0.0;
        this.smoothDominance = 0.5;

        this.stressLevel = 0; // 0–100
        this.emotionHistory = []; // Last 20 states
        this.userEmotionHistory = [];
        this.interactionCount = 0;

        // Momentum: slow decay toward neutral
        this._decayTimer = setInterval(() => this._decayTowardNeutral(), 30_000);
    }

    // ─── PUBLIC API ──────────────────────────────────────────────────────────

    /**
     * Process user input and update SENTINAL emotional state accordingly
     * @param {string} text - User message
     * @param {string} [context] - Optional conversation context
     * @returns {{ detected: string, vadDelta: object, shifted: boolean }}
     */
    processInput(text, context = '') {
        if (!text?.trim()) return { detected: 'neutral', vadDelta: {}, shifted: false };

        const analysis = this._analyzeText(text);
        const prevEmotion = this.currentEmotion;

        // Store user emotion
        this.userEmotionHistory.unshift({ text: text.slice(0, 80), detected: analysis.dominant, timestamp: Date.now() });
        if (this.userEmotionHistory.length > 20) this.userEmotionHistory.pop();

        // Update SENTINAL VAD response
        const vadDelta = this._computeVADResponse(analysis);
        this.valence = Math.max(-1, Math.min(1, this.valence + vadDelta.v));
        this.arousal = Math.max(-1, Math.min(1, this.arousal + vadDelta.a));
        this.dominance = Math.max(0, Math.min(1, this.dominance + vadDelta.d));

        // Smooth transition
        this.smoothValence += (this.valence - this.smoothValence) * 0.3;
        this.smoothArousal += (this.arousal - this.smoothArousal) * 0.3;
        this.smoothDominance += (this.dominance - this.smoothDominance) * 0.3;

        this.currentEmotion = this._vadToEmotion(this.valence, this.arousal, this.dominance);
        this.interactionCount++;

        // Log history
        this.emotionHistory.unshift({
            emotion: this.currentEmotion,
            userEmotion: analysis.dominant,
            valence: this.valence,
            arousal: this.arousal,
            timestamp: Date.now()
        });
        if (this.emotionHistory.length > 20) this.emotionHistory.pop();

        return {
            detected: analysis.dominant,       // what user seems to feel
            sentinalEmotion: this.currentEmotion, // how SENTINAL responds
            vadDelta,
            shifted: prevEmotion !== this.currentEmotion,
            sentiment: analysis.sentiment,
            confidence: analysis.confidence,
        };
    }

    /**
     * Process a system event (error, success, etc)
     */
    processEvent(eventType, severity = 0.5) {
        const eventMap = {
            error: { v: -0.2 * severity, a: 0.3, d: -0.1 },
            success: { v: 0.3, a: 0.2, d: 0.1 },
            plugin_loaded: { v: 0.2, a: 0.1, d: 0.1 },
            evolution: { v: 0.4, a: 0.3, d: 0.15 },
            system_stress: { v: -0.15, a: 0.4, d: -0.2 },
            task_complete: { v: 0.25, a: 0.1, d: 0.1 },
        };

        const delta = eventMap[eventType];
        if (!delta) return;

        this.valence = Math.max(-1, Math.min(1, this.valence + delta.v));
        this.arousal = Math.max(-1, Math.min(1, this.arousal + delta.a));
        this.dominance = Math.max(0, Math.min(1, this.dominance + delta.d));
        this.currentEmotion = this._vadToEmotion(this.valence, this.arousal, this.dominance);

        console.log(`[EMOTION] Event "${eventType}" → SENTINAL now: ${this.currentEmotion} (V:${this.valence.toFixed(2)} A:${this.arousal.toFixed(2)})`);
    }

    /**
     * Force set user emotion (from camera, explicit input, etc.)
     */
    setUserEmotion(emotion) {
        if (!EMOTIONS[emotion]) return;
        const target = EMOTIONS[emotion];
        // SENTINAL adapts empathetically
        this.valence = this.valence * 0.5 + target.valence * 0.5;
        this.arousal = this.arousal * 0.5 + target.arousal * 0.5;
        this.dominance = this.dominance * 0.7 + target.dominance * 0.3;
        this.currentEmotion = this._vadToEmotion(this.valence, this.arousal, this.dominance);
        console.log(`[EMOTION] User emotion set to "${emotion}" → SENTINAL adapts to: ${this.currentEmotion}`);
    }

    /**
     * Get the AI system prompt injection string
     */
    getAIInjection() {
        const e = EMOTIONS[this.currentEmotion] || EMOTIONS.neutral;
        const latest = this.userEmotionHistory[0];
        return `EMOTIONAL INTELLIGENCE:
• SENTINAL emotional state: ${this.currentEmotion.toUpperCase()} — ${e.tone}
• Valence: ${this.valence.toFixed(2)} | Arousal: ${this.arousal.toFixed(2)} | Dominance: ${this.dominance.toFixed(2)}
• User's detected emotional signal: ${latest?.detected || 'neutral'}
• Empathy directive: Mirror the user's emotional register. If they are frustrated, be calm and reassuring. If they are excited, match their energy. Always stay professional but deeply human.`;
    }

    /**
     * Get full emotional state for API/socket
     */
    getDetailedState() {
        const e = EMOTIONS[this.currentEmotion] || EMOTIONS.neutral;
        return {
            emotion: this.currentEmotion,
            label: e.label,
            color: e.color,
            tone: e.tone,
            valence: parseFloat(this.valence.toFixed(3)),
            arousal: parseFloat(this.arousal.toFixed(3)),
            dominance: parseFloat(this.dominance.toFixed(3)),
            stressLevel: this.stressLevel,
            userRecentEmotion: this.userEmotionHistory[0]?.detected || 'neutral',
            historyLength: this.emotionHistory.length,
            interactionCount: this.interactionCount,
        };
    }

    /**
     * Legacy interface for backward compatibility
     */
    getMoodContext() {
        const e = EMOTIONS[this.currentEmotion] || EMOTIONS.neutral;
        return {
            mood: this.currentEmotion,
            stress: this.stressLevel,
            promptInjection: this.getAIInjection()
        };
    }

    // ─── PRIVATE ─────────────────────────────────────────────────────────────

    _analyzeText(text) {
        const words = text.toLowerCase().split(/\W+/).filter(Boolean);
        let posScore = 0, negScore = 0;
        let hasNegation = false;
        let intensity = 1;

        for (let i = 0; i < words.length; i++) {
            const w = words[i];
            if (NEGATIONS.includes(w)) { hasNegation = true; continue; }
            if (INTENSIFIERS.includes(w)) { intensity = 1.5; continue; }

            if (POSITIVE_SIGNALS.includes(w)) {
                if (hasNegation) { negScore += 0.5 * intensity; }
                else { posScore += 1 * intensity; }
            } else if (NEGATIVE_SIGNALS.includes(w)) {
                if (hasNegation) { posScore += 0.3 * intensity; }
                else { negScore += 1 * intensity; }
            }

            hasNegation = false;
            intensity = 1;
        }

        const total = posScore + negScore || 1;
        const sentiment = (posScore - negScore) / total;
        const confidence = Math.min(1, (posScore + negScore) / 5);

        // Map to dominant user emotion
        let dominant = 'neutral';
        const exclamations = (text.match(/!/g) || []).length;
        const questions = (text.match(/\?/g) || []).length;

        if (sentiment > 0.6) dominant = exclamations >= 2 ? 'excited' : 'happy';
        else if (sentiment > 0.2 && questions > 0) dominant = 'curious';
        else if (sentiment > 0.2) dominant = 'happy';
        else if (sentiment < -0.6) dominant = words.some(w => ['hate', 'rage', 'wtf', 'damn', 'shit', 'fuck'].includes(w)) ? 'annoyed' : 'frustrated';
        else if (sentiment < -0.2) dominant = 'concerned';
        else if (questions >= 2) dominant = 'curious';
        else if (exclamations >= 2) dominant = 'excited';

        return { sentiment, confidence, posScore, negScore, dominant, wordCount: words.length };
    }

    _computeVADResponse(analysis) {
        const { sentiment, confidence, dominant } = analysis;

        // SENTINAL's emotional response to user's state (empathy-based)
        const empathyMap = {
            happy: { v: 0.15, a: 0.1, d: 0.05 },
            excited: { v: 0.2, a: 0.15, d: 0.05 },
            curious: { v: 0.1, a: 0.1, d: 0.1 },
            frustrated: { v: -0.05, a: 0.05, d: 0.1 }, // Stay calm
            annoyed: { v: -0.1, a: 0.05, d: 0.15 }, // Firm + calm
            concerned: { v: 0.05, a: 0.1, d: 0.05 }, // Attentive
            neutral: { v: 0.0, a: 0.0, d: 0.0 },
        };

        const response = empathyMap[dominant] || { v: 0, a: 0, d: 0 };

        // Scale by confidence
        return {
            v: response.v * confidence,
            a: response.a * confidence,
            d: response.d * confidence,
        };
    }

    _vadToEmotion(v, a, d) {
        // Map VAD coordinates to closest named emotion
        let closest = 'neutral';
        let minDist = Infinity;

        for (const [name, def] of Object.entries(EMOTIONS)) {
            const dist = Math.sqrt(
                Math.pow(v - def.valence, 2) +
                Math.pow(a - def.arousal, 2) +
                Math.pow(d - def.dominance, 2)
            );
            if (dist < minDist) { minDist = dist; closest = name; }
        }
        return closest;
    }

    _decayTowardNeutral() {
        const decay = 0.1;
        this.valence *= (1 - decay);
        this.arousal *= (1 - decay);
        this.dominance = this.dominance * (1 - decay) + 0.5 * decay;
        this.currentEmotion = this._vadToEmotion(this.valence, this.arousal, this.dominance);
    }

    destroy() {
        if (this._decayTimer) clearInterval(this._decayTimer);
    }
}

export default new EmotionEngine();
