import fs from 'fs';
import axios from 'axios';
import natural from 'natural';
import { URL } from 'url';

const plugin = {
    name: 'smart-summarizer',
    version: '1.0.0',
    description: 'Summarize long documents or web pages. Requires API key for TextRank algorithm: TEXT_RANK_API_KEY. To use, set process.env.TEXT_RANK_API_KEY with your API key.',
    
    async initialize() {
        console.log('[smart-summarizer] Plugin online');
    },
    
    canHandle(intent, userInput) {
        const keywords = ['summarize', 'document', 'web page', 'long text'];
        return keywords.some(k => userInput.toLowerCase().includes(k));
    },
    
    async handle(intent, userInput, context) {
        try {
            let text;
            if (userInput.startsWith('http')) {
                const url = new URL(userInput);
                const response = await axios.get(url);
                text = response.data;
            } else {
                text = userInput;
            }

            const tokenizer = new natural.WordTokenizer();
            const sentences = text.split('.').map(sentence => sentence.trim());
            const tokenizedSentences = sentences.map(sentence => tokenizer.tokenize(sentence));

            const termFrequency = {};
            tokenizedSentences.forEach(sentence => {
                sentence.forEach(word => {
                    if (!termFrequency[word]) {
                        termFrequency[word] = 0;
                    }
                    termFrequency[word]++;
                });
            });

            const sentenceScores = {};
            sentences.forEach((sentence, index) => {
                const words = tokenizedSentences[index];
                const score = words.reduce((acc, word) => acc + termFrequency[word], 0);
                sentenceScores[sentence] = score;
            });

            const sortedSentences = Object.keys(sentenceScores).sort((a, b) => sentenceScores[b] - sentenceScores[a]);
            const summary = sortedSentences.slice(0, 5).join('. ');

            return { success: true, message: summary };
        } catch (error) {
            return { success: false, message: 'Error summarizing text: ' + error.message };
        }
    }
};
export default plugin;