import natural from 'natural';

const { PorterStemmer, SentimentAnalyzer, WordTokenizer } = natural;

function extractTargetText(userInput = '') {
    const quoted = userInput.match(/["']([^"']+)["']/);
    if (quoted) {
        return quoted[1];
    }

    return userInput
        .replace(/.*?(?:analyze|check)\s+(?:the\s+)?(?:sentiment|tone|mood|emotion)\s+(?:of|for)?/i, '')
        .trim();
}

const plugin = {
    name: 'sentiment-analyzer',
    version: '1.1.0',
    description: 'Analyzes the sentiment of user-provided text without relying on external APIs.',

    async initialize() {
        console.log('[sentiment-analyzer] Plugin online');
        this.tokenizer = new WordTokenizer();
        this.analyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn');
    },

    canHandle(intent, userInput) {
        return /\b(sentiment|tone|mood|emotion)\b/i.test(userInput) && /\b(analyze|check|detect)\b/i.test(userInput);
    },

    async handle(intent, userInput) {
        const targetText = extractTargetText(userInput);
        if (!targetText) {
            return { success: false, message: 'Provide text to analyze.' };
        }

        const tokens = this.tokenizer.tokenize(targetText);
        const score = this.analyzer.getSentiment(tokens);

        let label = 'neutral';
        if (score > 0.25) label = 'positive';
        if (score < -0.25) label = 'negative';

        return {
            success: true,
            message: `Sentiment: ${label} (score ${score.toFixed(2)})`
        };
    }
};

export default plugin;
