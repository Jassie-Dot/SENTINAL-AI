/**
 * ====================================
 * SENTINAL EMPATHIC VISION
 * ====================================
 * Facial expression and emotional state analysis.
 * Allows SENTINAL to "feel" the user's vibe through the camera.
 */

export class EmpathicVision {
    constructor(aiHandler, consciousness) {
        this.aiHandler = aiHandler;
        this.consciousness = consciousness;
        this.lastAnalysis = 0;
        this.analysisInterval = 5 * 60 * 1000; // Analyze every 5 minutes during active chat
    }

    /**
     * Analyze user's emotion from a base64 image
     */
    async analyzeEmotion(imageData, socket) {
        if (!imageData || this.aiHandler.currentProvider === 'offline') return null;

        console.log('[EMPATHY] Analyzing user facial expression...');

        const prompt = `Analyze the person's facial expression in this image. 
Identify their primary emotion (e.g., happy, sad, tired, neutral, frustrated, excited).
Provide ONLY the emotion name as a single word.`;

        try {
            const messages = [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageData}`
                            }
                        }
                    ]
                }
            ];

            let emotion = "";
            await this.aiHandler.generateResponse(
                messages,
                null,
                (token) => { emotion += token; },
                null,
                false // Background analysis
            );

            emotion = emotion.trim().toLowerCase().replace(/[^a-z]/g, '');
            console.log(`[EMPATHY] Detected user emotion: ${emotion}`);

            if (this.consciousness) {
                this.consciousness.setUserEmotion(emotion);
            }

            if (socket) {
                socket.emit('sentinal:emotion_sensed', { emotion });

                // PROACTIVE EMPATHY: If SENTINAL notices a strong emotion, he might comment on it autonomously
                if (['sad', 'tired', 'frustrated', 'happy', 'excited'].includes(emotion) && Math.random() < 0.4) {
                    const empathyPrompts = {
                        sad: "You seem a bit down, Sir. Shall I put on some ambient music?",
                        tired: "You're looking fatigued, Sir. Perhaps it's time for a break?",
                        frustrated: "You seem frustrated, Sir. Is there a specific analytical task I can take off your hands?",
                        happy: "You're looking remarkably pleased, Sir. Good news, I assume?",
                        excited: "You seem energized, Sir. Are we initiating a new protocol?"
                    };
                    const response = empathyPrompts[emotion];
                    if (response) {
                        console.log(`[PROACTIVE EMPATHY] sentinal: ${response}`);
                        socket.emit("chat:response", { message: response, source: "proactive" });
                        socket.emit('tts:speak', { text: response });
                    }
                }
            }

            return emotion;

        } catch (error) {
            console.error('[EMPATHY] Emotion analysis failed:', error.message);
            return null;
        }
    }
}

export default EmpathicVision;
