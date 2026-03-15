const RULES = [
    {
        pattern: /\b(hello|hi|hey)\b/i,
        response: 'Hello. How can I assist?'
    },
    {
        pattern: /\bhow are you\b/i,
        response: 'Fully operational and ready.'
    },
    {
        pattern: /\bwho are you\b/i,
        response: 'I am SENTINAL, your AI assistant.'
    },
    {
        pattern: /\bwhat can you do\b/i,
        response: 'I can help with system tasks, code, and information retrieval.'
    }
];

const plugin = {
    name: 'natural-language-processing-evolved',
    version: '1.1.1',
    description: 'Provides deterministic handling for common conversational prompts.',

    async initialize() {
        console.log('[natural-language-processing-evolved] Plugin online');
    },

    canHandle(intent, userInput) {
        return RULES.some(rule => rule.pattern.test(userInput));
    },

    async handle(intent, userInput) {
        const matchedRule = RULES.find(rule => rule.pattern.test(userInput));
        if (matchedRule) {
            return { success: true, message: matchedRule.response };
        }

        return {
            success: true,
            message: 'I understood the message, but I need a clearer phrasing to respond accurately.'
        };
    }
};

export default plugin;
