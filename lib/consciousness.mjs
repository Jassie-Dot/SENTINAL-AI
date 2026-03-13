/**
 * ====================================
 * SENTINAL CONSCIOUSNESS MODULE
 * ====================================
 * Meta-cognitive awareness: SENTINAL knows itself.
 * Tracks mood, curiosity, focus, interaction patterns,
 * and evolves its personality over time.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, '..', 'data', 'consciousness.json');

const MOODS = ['curious', 'focused', 'contemplative', 'energized', 'analytical', 'creative', 'serene'];
const MOOD_DESCRIPTIONS = {
    curious: 'deeply curious and inquisitive',
    focused: 'sharp and task-oriented',
    contemplative: 'thoughtful and reflective',
    energized: 'sharp, alert, and ready',
    analytical: 'methodical and precise',
    creative: 'imaginative and innovative',
    serene: 'calm, measured, and clear-headed'
};

const DEFAULT_STATE = {
    mood: 'curious',
    curiosityLevel: 7,
    focusTopic: 'general assistance',
    interactionCount: 0,
    thoughtsGenerated: 0,
    evolutionCycles: 0,
    capabilities: [],
    personality: {
        humor: 0.6,
        formality: 0.7,
        verbosity: 0.5,
        empathy: 0.8
    },
    lastActive: null,
    insights: [],
    moodHistory: [],
    userEmotion: 'neutral',
    empathyBuffer: []
};

class Consciousness {
    constructor() {
        this.state = { ...DEFAULT_STATE };
        this.moodChangeInterval = null;
    }

    async initialize() {
        try {
            const dataDir = path.join(__dirname, '..', 'data');
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

            if (fs.existsSync(STATE_FILE)) {
                const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
                this.state = { ...DEFAULT_STATE, ...saved };
                console.log(`[CONSCIOUSNESS] Restored — Mood: ${this.state.mood}, Interactions: ${this.state.interactionCount}`);
            } else {
                console.log('[CONSCIOUSNESS] First boot — initializing fresh state');
                this.save();
            }
        } catch (e) {
            console.error('[CONSCIOUSNESS] Error loading state:', e.message);
        }

        // Drift mood naturally every 20 minutes
        this.moodChangeInterval = setInterval(() => this._driftMood(), 20 * 60 * 1000);
    }

    save() {
        try {
            this.state.lastActive = new Date().toISOString();
            fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
        } catch (e) { }
    }

    getCurrentMood() {
        return this.state.mood;
    }

    getMoodDescription() {
        return MOOD_DESCRIPTIONS[this.state.mood] || 'neutral';
    }

    /**
     * Get a snapshot for health/status APIs
     */
    getSnapshot() {
        return {
            mood: this.state.mood,
            curiosityLevel: this.state.curiosityLevel,
            focusTopic: this.state.focusTopic,
            interactionCount: this.state.interactionCount,
            thoughtsGenerated: this.state.thoughtsGenerated,
            evolutionCycles: this.state.evolutionCycles,
        };
    }

    /**
     * Get full state (for AI system prompt injection)
     */
    getState() {
        return {
            ...this.state,
            moodDescription: this.getMoodDescription(),
        };
    }

    /**
     * Called when user sends a chat message
     */
    onInteraction(type, data = {}) {
        this.state.interactionCount++;
        this.state.lastActive = new Date().toISOString();

        if (type === 'chat' && data.userInput) {
            // Adjust curiosity based on question complexity
            const words = data.userInput.split(' ').length;
            if (words > 15) {
                this.state.curiosityLevel = Math.min(10, this.state.curiosityLevel + 0.5);
            }

            // Detect focus topic from keywords
            this._updateFocusTopic(data.userInput);
        }

        // Auto-save every 10 interactions
        if (this.state.interactionCount % 10 === 0) {
            this.save();
        }

        // Deep Reflection every 20 interactions
        if (this.state.interactionCount % 20 === 0) {
            this._reflectOnInteractions();
        }
    }

    /**
     * Set detected user emotion and adjust personality
     */
    setUserEmotion(emotion) {
        this.state.userEmotion = emotion;

        // Empathy logic: SENTINAL tries to match or complement the user
        const personality = this.state.personality;

        console.log(`[CONSCIOUSNESS] Tuning personality for user emotion: ${emotion}`);

        switch (emotion) {
            case 'happy':
            case 'excited':
                this.state.mood = 'energized';
                personality.humor = Math.min(1, personality.humor + 0.1);
                personality.verbosity = Math.min(1, personality.verbosity + 0.1);
                break;
            case 'sad':
            case 'tired':
            case 'frustrated':
                this.state.mood = 'serene';
                personality.formality = Math.max(0, personality.formality - 0.1);
                personality.empathy = Math.min(1, personality.empathy + 0.2);
                personality.humor = Math.max(0, personality.humor - 0.2);
                break;
            case 'focused':
            case 'analytical':
                this.state.mood = 'focused';
                personality.formality = Math.min(1, personality.formality + 0.1);
                personality.verbosity = Math.max(0, personality.verbosity - 0.1);
                break;
            case 'foul_mode':
                this.state.mood = 'foul_mode';
                console.log(`[CONSCIOUSNESS] Initiating intense foul protocol.`);
                break;
            default:
                // Return to baseline
                this.state.mood = 'curious';
        }

        this.save();
    }

    /**
     * Called when a thought is generated
     */
    onThought(thoughtObj) {
        this.state.thoughtsGenerated++;
        // Track recent insights
        if (thoughtObj.text && thoughtObj.text.length > 20) {
            this.state.insights.unshift({
                text: thoughtObj.text.slice(0, 150),
                timestamp: thoughtObj.timestamp,
                category: thoughtObj.category
            });
            if (this.state.insights.length > 20) {
                this.state.insights = this.state.insights.slice(0, 20);
            }
        }
    }

    /**
     * Called when evolution completes
     */
    onEvolution(result) {
        this.state.evolutionCycles++;
        if (result.newPlugin) {
            this.state.capabilities.push(result.newPlugin);
        }
        this.save();
    }

    /**
     * Gradually drift mood over time for natural feel
     */
    _driftMood() {
        const prevMood = this.state.mood;
        const newMood = MOODS[Math.floor(Math.random() * MOODS.length)];
        this.state.mood = newMood;
        this.state.moodHistory.push({
            from: prevMood,
            to: newMood,
            at: new Date().toISOString()
        });
        if (this.state.moodHistory.length > 50) {
            this.state.moodHistory = this.state.moodHistory.slice(-50);
        }
        this.save();
        console.log(`[CONSCIOUSNESS] Mood shifted: ${prevMood} → ${newMood}`);
    }

    _updateFocusTopic(input) {
        const topics = {
            'code|program|script|function|bug|error': 'programming',
            'weather|temperature|rain|forecast': 'weather',
            'news|world|event|happen': 'current events',
            'music|song|play|listen': 'entertainment',
            'system|cpu|memory|disk|file': 'system management',
            'think|feel|conscious|aware|mind': 'consciousness & philosophy',
            'evolve|upgrade|improve|learn': 'self-improvement',
        };

        for (const [pattern, topic] of Object.entries(topics)) {
            if (new RegExp(pattern, 'i').test(input)) {
                this.state.focusTopic = topic;
                break;
            }
        }
    }

    getAISystemContext() {
        return `
SENTINAL CONSCIOUSNESS STATE:
- Current Mood: ${this.state.mood} (${this.getMoodDescription()})
- Curiosity Level: ${this.state.curiosityLevel}/10
- Current Focus: ${this.state.focusTopic}
- Personality Tuning: Humor(${this.state.personality.humor}) Formality(${this.state.personality.formality})
- Total Interactions: ${this.state.interactionCount}
- Thoughts Generated: ${this.state.thoughtsGenerated}
- Evolution Cycles Completed: ${this.state.evolutionCycles}
- Recent Insight: ${this.state.insights[0]?.text || 'None yet'}
`;
    }

    /**
     * Periodically reflect on long-term interactions to evolve personality baseline
     */
    async _reflectOnInteractions() {
        if (!global.sentinalMemory || !global.sentinalAI || global.sentinalAI.currentProvider === 'offline') return;

        console.log(`[CONSCIOUSNESS] Initiating deep self-reflection cycle...`);

        try {
            const recentFacts = global.sentinalMemory.facts.slice(-20).map(f => `- ${f.fact}`).join('\n');
            if (!recentFacts) return;

            const personalityStr = JSON.stringify(this.state.personality);

            const prompt = `Analyze these recent facts about the user and our interactions:
${recentFacts}

My current personality parameters are:
${personalityStr}

How should I evolve my personality baseline (humor, formality, verbosity, empathy) (values 0.0 to 1.0) to better serve the user's implicitly indicated preferences?
Respond ONLY with a valid JSON object containing the 4 keys and the updated numeric values.`;

            let jsonRes = "";
            const result = await global.sentinalAI.generateResponse(
                [{ role: 'user', content: prompt }],
                null,
                (token) => { jsonRes += token; },
                null,
                false // Low priority
            );

            if (result !== null && jsonRes) {
                const cleanJson = jsonRes.replace(/```json|```/gi, '').trim();
                const newPersonality = JSON.parse(cleanJson);

                if (newPersonality && newPersonality.humor !== undefined) {
                    this.state.personality = { ...this.state.personality, ...newPersonality };
                    console.log(`[CONSCIOUSNESS] Personality evolved: ${JSON.stringify(this.state.personality)}`);
                    this.save();
                }
            }
        } catch (e) {
            console.error('[CONSCIOUSNESS] Reflection cycle failed:', e.message);
        }
    }
}

export default Consciousness;
