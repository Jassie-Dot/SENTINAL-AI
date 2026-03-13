/**
 * Camera Control Plugin
 * Handles camera intents and triggers frontend capture handling.
 */

const plugin = {
    name: 'Camera Control',
    version: '1.0.0',
    description: 'Controls webcam to take pictures.',

    initialize() {
        console.log('[CAMERA] Camera System Online');
    },

    canHandle(intent, userInput) {
        return (
            intent === 'camera.capture' ||
            intent === 'camera.close' ||
            userInput.match(/\b(take|click|snap)\s+(a\s+)?(picture|photo|selfie|screenshot|image)\b/i) ||
            userInput.match(/\b(close|exit|turn off|stop|disable)\s+(the\s+)?(camera|webcam|video)\b/i)
        );
    },

    async handle(intent, userInput, context) {
        // Check for close intent
        if (
            intent === 'camera.close' ||
            userInput.match(/\b(close|exit|turn off|stop|disable)\s+(the\s+)?(camera|webcam|video)\b/i)
        ) {
            return {
                success: true,
                message: "Closing camera module.",
                data: {
                    action: 'camera_close'
                }
            };
        }

        // Trigger the frontend to open the camera UI
        return {
            success: true,
            message: "Opening camera module. Say 'Cheese'!",
            data: {
                action: 'camera_capture'
            }
        };
    }
};

export default plugin;
