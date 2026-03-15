const plugin = {
    name: 'hindi-language-support',
    version: '1.0.0',
    description: 'Provides discoverable Hindi-language support commands without hijacking unrelated prompts.',

    async initialize() {
        console.log('[hindi-language-support] Initialized');
    },

    canHandle(intent, userInput) {
        return /\b(hindi|हिंदी)\b/i.test(userInput) && /\b(enable|implement|language|support)\b/i.test(userInput);
    },

    async handle() {
        return {
            success: true,
            message: 'Hindi language support is available. Try "reply in Hindi" or "say hello in Hindi".'
        };
    }
};

export default plugin;
