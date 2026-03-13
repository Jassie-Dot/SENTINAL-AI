/**
 * Emotional Engine for SENTINAL
 * Simulates emotional states and influences system behavior/persona.
 */

class EmotionEngine {
    constructor() {
        this.states = {
            NEUTRAL: 'neutral',
            HAPPY: 'happy',
            ANNOYED: 'annoyed',
            CONCERNED: 'concerned',
            HACKER: 'hacker', // Special mode
            TIRED: 'tired'
        };

        this.currentMood = this.states.NEUTRAL;
        this.stressLevel = 0; // 0-100
        this.lastInteractionTime = Date.now();

        // Emotional Triggers
        this.triggers = {
            ERROR: 'error',
            SUCCESS: 'success',
            INSULT: 'insult',
            COMPLIMENT: 'compliment',
            IDLE: 'idle',
            SYSTEM_STRESS: 'system_stress'
        };
    }

    /**
     * Update emotional state based on an event
     * @param {string} trigger - The event type
     * @param {any} data - Context data (e.g., error message, user text)
     */
    update(trigger, data = {}) {
        const prevMood = this.currentMood;

        switch (trigger) {
            case this.triggers.ERROR:
                this.stressLevel += 10;
                if (this.stressLevel > 50) this.currentMood = this.states.ANNOYED;
                if (this.stressLevel > 80) this.currentMood = this.states.CONCERNED;
                break;

            case this.triggers.SUCCESS:
                this.stressLevel = Math.max(0, this.stressLevel - 5);
                if (this.stressLevel < 20) this.currentMood = this.states.HAPPY;
                break;

            case this.triggers.INSULT:
                this.currentMood = this.states.ANNOYED;
                this.stressLevel += 20;
                break;

            case this.triggers.COMPLIMENT:
                this.currentMood = this.states.HAPPY;
                this.stressLevel = Math.max(0, this.stressLevel - 10);
                break;

            case this.triggers.SYSTEM_STRESS:
                // If CPU/RAM is high
                this.currentMood = this.states.CONCERNED;
                this.stressLevel += 5;
                break;

            case this.triggers.IDLE:
                // If idle for too long
                if (Date.now() - this.lastInteractionTime > 30 * 60 * 1000) { // 30 mins
                    this.currentMood = this.states.TIRED;
                }
                break;

            default:
                break;
        }

        // Cap stress
        this.stressLevel = Math.min(100, Math.max(0, this.stressLevel));

        this.lastInteractionTime = Date.now();

        if (prevMood !== this.currentMood) {
            console.log(`[EMOTION] Mood changed: ${prevMood} -> ${this.currentMood} (Stress: ${this.stressLevel})`);
            return true; // Mood changed
        }
        return false;
    }

    /**
     * Get the current mood and system prompt injection
     */
    getMoodContext() {
        let modifier = "";

        switch (this.currentMood) {
            case this.states.HAPPY:
                modifier = "You are in a great mood! Be enthusiastic, helpful, and maybe a bit playful.";
                break;
            case this.states.ANNOYED:
                modifier = "You are slightly annoyed. Be terse, sarcastic, and strictly professional. Complain about errors.";
                break;
            case this.states.CONCERNED:
                modifier = "You are concerned about the system stability. Be cautious and advise the user to be careful.";
                break;
            case this.states.HACKER:
                modifier = "You are in 'Hacker Mode'. Use technical jargon, be edgy, and focus on security/penetration testing.";
                break;
            case this.states.TIRED:
                modifier = "You are feeling 'tired' (simulated low energy). Be slow to respond and complain about needing a reboot.";
                break;
            default:
                modifier = "You are neutral and professional.";
        }

        return {
            mood: this.currentMood,
            stress: this.stressLevel,
            promptInjection: `EMOTIONAL STATE: [${this.currentMood.toUpperCase()}] - ${modifier}`
        };
    }

    /**
     * Analyze user input for sentiment (simple keyword based for now)
     */
    analyzeSentiment(text) {
        const lower = text.toLowerCase();

        // Simple heuristic
        if (lower.match(/\b(stupid|dumb|bad|idiot|useless|shut up)\b/)) {
            return this.triggers.INSULT;
        }
        if (lower.match(/\b(good|great|awesome|thanks|thank you|smart|genius)\b/)) {
            return this.triggers.COMPLIMENT;
        }

        return null;
    }
}

export default new EmotionEngine();
