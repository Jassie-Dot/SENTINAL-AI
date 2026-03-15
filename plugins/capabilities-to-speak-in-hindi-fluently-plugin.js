const COMMON_PHRASES = new Map([
    ['hello', 'namaste'],
    ['hi', 'namaste'],
    ['how are you', 'aap kaise hain?'],
    ['thank you', 'dhanyavad'],
    ['good morning', 'suprabhat'],
    ['good night', 'shubh ratri'],
    ['please', 'kripya'],
    ['yes', 'haan'],
    ['no', 'nahin']
]);

function extractRequestedPhrase(userInput = '') {
    const quoted = userInput.match(/["']([^"']+)["']/);
    if (quoted) return quoted[1].trim();

    const commandMatch = userInput.match(/(?:say|speak|translate|reply)(?:\s+this)?(?:\s+in\s+hindi)?\s+(.+)/i);
    return commandMatch ? commandMatch[1].trim() : '';
}

const plugin = {
    name: 'hindi-fluency-plugin',
    version: '1.0.0',
    description: 'Provides basic Hindi phrase support for direct user requests.',

    async initialize() {
        console.log('[hindi-fluency-plugin] Initialized');
    },

    canHandle(intent, userInput) {
        return /\b(hindi|हिंदी)\b/i.test(userInput) && /\b(speak|say|translate|reply|talk|fluently)\b/i.test(userInput);
    },

    async handle(intent, userInput) {
        const requestedPhrase = extractRequestedPhrase(userInput);
        const translated = COMMON_PHRASES.get(requestedPhrase.toLowerCase());

        if (translated) {
            return {
                success: true,
                message: `"${requestedPhrase}" in Hindi: ${translated}`
            };
        }

        if (requestedPhrase) {
            return {
                success: true,
                message: `Main Hindi mein baat kar sakta hoon. Aap keh sakte hain: "${requestedPhrase}".`
            };
        }

        return {
            success: true,
            message: 'Main Hindi mein baat kar sakta hoon. Koi phrase boliye, aur main Hindi mein jawab dunga.'
        };
    }
};

export default plugin;
