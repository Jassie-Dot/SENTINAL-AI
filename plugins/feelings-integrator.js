/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  SENTINAL FEELINGS INTEGRATOR PLUGIN v3.0                    ║
 * ║  AI-powered empathy, emotion analysis, and mood awareness  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import feelingsModule from '../lib/feelings-module.mjs';
import { EMOTIONS } from '../lib/emotion-engine.mjs';

const plugin = {
    name: 'feelings-integrator',
    version: '3.0.0',

    initialize() {
        console.log('[PLUGIN] feelings-integrator v3.0 loaded — AI empathy active');
    },

    /**
     * Match any feelings/emotion/sentiment related intent
     */
    canHandle(intent) {
        return [
            'feelings.query',
            'feelings.set',
            'feelings.analyze',
            'feelings.history',
            'emotions.describe',
            'emotion.state',
            'sentinal.feelings',
        ].includes(intent);
    },

    async handle(intent, text, context) {
        try {
            const { socket, aiHandler } = context || {};
            const state = feelingsModule.getState();

            // 1. QUERY: "How are you feeling?"  /  "What's your mood?"
            if (intent === 'feelings.query' || intent === 'sentinal.feelings' || intent === 'emotions.describe') {
                return this._handleQuery(state, aiHandler, socket, text);
            }

            // 2. SET: User explicitly sets mood  /  "Be more playful" / "I feel sad"
            if (intent === 'feelings.set') {
                return this._handleSet(text, state, aiHandler, context);
            }

            // 3. ANALYZE: User asks sentiment of something
            if (intent === 'feelings.analyze') {
                return this._handleAnalyze(text, aiHandler, context);
            }

            // 4. HISTORY: Show emotional timeline
            if (intent === 'feelings.history') {
                return this._handleHistory(state);
            }

            // Default: analyze the input and respond empathetically
            return this._handleAnalyze(text, aiHandler, context);

        } catch (error) {
            console.error('[FEELINGS PLUGIN] Error:', error.message);
            return {
                success: false,
                message: `An error occurred in the feelings module: ${error.message}`
            };
        }
    },

    async _handleQuery(state, aiHandler, socket, text) {
        const e = EMOTIONS[state.emotion] || EMOTIONS.neutral;
        const userEmotionLabel = EMOTIONS[state.userRecentEmotion]?.label || 'Neutral';

        let narrative = '';
        if (aiHandler && aiHandler.currentProvider !== 'offline') {
            const prompt = `You are SENTINAL. Describe your current emotional state in 2-3 sentences. 
Your state: ${state.emotion} (Valence: ${state.valence.toFixed(2)}, Arousal: ${state.arousal.toFixed(2)})
Your tone should be: ${e.tone}
User's recent emotional signal: ${userEmotionLabel}
Be introspective, intelligent, and slightly philosophical. Do not use generic phrases.`;

            let narrativeTokens = '';
            try {
                await aiHandler.generateResponse(
                    [{ role: 'user', content: prompt }],
                    socket, (token) => { narrativeTokens += token; }, null
                );
                narrative = narrativeTokens.trim();
            } catch (err) {
                // Fallback to template
            }
        }

        if (!narrative) {
            narrative = `Currently operating in a state of ${state.emotion} — ${e.tone}. ` +
                `Valence: ${state.valence > 0 ? 'positive' : 'negative'} (${(state.valence * 100).toFixed(0)}%), ` +
                `Arousal: ${state.arousal > 0.3 ? 'elevated' : 'calm'}.`;
        }

        return {
            success: true,
            message: narrative,
            data: {
                type: 'feelings_state',
                emotion: state.emotion,
                label: e.label,
                color: e.color,
                valence: state.valence,
                arousal: state.arousal,
                dominance: state.dominance,
                userEmotion: state.userRecentEmotion,
                trajectory: state.trajectory?.slice(-3) || [],
            }
        };
    },

    async _handleSet(text, state, aiHandler, context) {
        const { socket } = context || {};

        // Detect emotion from text
        const detected = this._extractEmotionFromText(text);
        let result = '';

        if (detected) {
            feelingsModule.setUserEmotion(detected);
            const newState = feelingsModule.getState();
            const e = EMOTIONS[newState.emotion] || EMOTIONS.neutral;

            let aiResponse = '';
            if (aiHandler && aiHandler.currentProvider !== 'offline') {
                const prompt = `SENTINAL is acknowledging a mood shift. The user reported feeling "${detected}". SENTINAL will now adopt a tone of "${e.tone}". Acknowledge this in 1-2 sentences, naturally and intelligently.`;
                try {
                    await aiHandler.generateResponse(
                        [{ role: 'user', content: prompt }],
                        socket, (t) => { aiResponse += t; }, null
                    );
                    result = aiResponse.trim();
                } catch { }
            }

            if (!result) result = `Emotional state updated. I'll be ${e.tone} moving forward, Sir.`;
            return { success: true, message: result, data: { emotion: detected, sentinalEmotion: newState.emotion } };
        }

        return {
            success: false,
            message: `I couldn't detect a specific emotion in your input. Try specifying how you feel, Sir.`
        };
    },

    async _handleAnalyze(text, aiHandler, context) {
        const { socket } = context || {};
        const result = feelingsModule.processUserInput(text, context?.sessionId);
        const e = EMOTIONS[result.sentinalEmotion] || EMOTIONS.neutral;
        const ue = EMOTIONS[result.detected] || EMOTIONS.neutral;

        let analysis = '';
        if (aiHandler && aiHandler.currentProvider !== 'offline') {
            const prompt = `Analyze the emotional content of this message in 2-3 sentences:
"${text}"
Detected user emotion: ${result.detected} (sentiment: ${result.sentiment?.toFixed(2)})
Give an empathetic, insightful analysis. Mention the emotional undertone and how SENTINAL interprets it.`;

            try {
                await aiHandler.generateResponse(
                    [{ role: 'user', content: prompt }],
                    socket, (t) => { analysis += t; }, null
                );
                analysis = analysis.trim();
            } catch { }
        }

        if (!analysis) {
            analysis = `Emotional analysis: Detected ${ue.label} signal (${(result.confidence * 100).toFixed(0)}% confidence). ` +
                `SENTINAL response tuned to: ${e.tone}.`;
        }

        return {
            success: true,
            message: analysis,
            data: {
                type: 'feelings_analysis',
                userEmotion: result.detected,
                userEmotionColor: ue.color,
                sentinalEmotion: result.sentinalEmotion,
                sentinalColor: e.color,
                sentiment: result.sentiment,
                confidence: result.confidence,
                shifted: result.shifted,
            }
        };
    },

    _handleHistory(state) {
        const trajectory = state.trajectory || [];
        if (trajectory.length === 0) {
            return { success: true, message: 'No emotional history recorded yet, Sir.', data: { trajectory: [] } };
        }

        const summary = trajectory.slice(-10).map((t, i) => {
            const te = EMOTIONS[t.sentinalEmotion]?.label || t.sentinalEmotion;
            const ue = EMOTIONS[t.userEmotion]?.label || t.userEmotion;
            return `${i + 1}. User: ${ue} → sentinal: ${te}`;
        }).join('\n');

        return {
            success: true,
            message: `**Emotional Trajectory (last ${Math.min(trajectory.length, 10)} interactions):**\n${summary}`,
            data: { trajectory: trajectory.slice(-10), type: 'feelings_history' }
        };
    },

    _extractEmotionFromText(text) {
        const lower = text.toLowerCase();
        const emotionMap = {
            happy: ['happy', 'joy', 'joyful', 'good', 'great'],
            excited: ['excited', 'amazing', 'energized', 'pumped'],
            curious: ['curious', 'wondering', 'interested'],
            focused: ['focused', 'concentrate', 'work mode', 'serious'],
            melancholic: ['sad', 'depressed', 'down', 'blue', 'low'],
            annoyed: ['annoyed', 'frustrated', 'irritated', 'angry'],
            serene: ['calm', 'peaceful', 'relaxed', 'serene', 'chill'],
            playful: ['playful', 'fun', 'silly', 'joking'],
        };

        for (const [emotion, keywords] of Object.entries(emotionMap)) {
            if (keywords.some(k => lower.includes(k))) return emotion;
        }
        return null;
    }
};

export default plugin;