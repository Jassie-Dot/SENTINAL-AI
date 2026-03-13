import fs from 'fs';
import v4 as uuid4 } from 'uuid';
import axios from 'axios';

const plugin = {
    name: 'sentiment-analyzer',
    version: '1.0.0',
    description: 'Analyze emotional tone of text. This plugin uses the MeaningCloud Sentiment Analysis API. To use this plugin, you need to set the following environment variables: MEANINGCLOUD_API_KEY, MEANINGCLOUD_API_URL',
    
    async initialize() {
        console.log('[sentiment-analyzer] Plugin online');
    },
    
    canHandle(intent, userInput) {
        const keywords = ['analyze', 'sentiment', 'mood', 'tone', 'emotion'];
        return keywords.some(k => userInput.toLowerCase().includes(k));
    },
    
    async handle(intent, userInput, context) {
        try {
            const apiKey = process.env.MEANINGCLOUD_API_KEY;
            const apiUrl = process.env.MEANINGCLOUD_API_URL;
            if (!apiKey || !apiUrl) {
                return { success: false, message: 'Missing API key or URL' };
            }
            
            const sentimentUrl = `${apiUrl}/sentiment-2.1?key=${apiKey}&lang=en&txt=${userInput}`;
            const response = await axios.get(sentimentUrl);
            const sentiment = response.data;
            
            const score = sentiment.score_tag;
            let message;
            if (score === 'P') {
                message = 'The sentiment of the text is positive.';
            } else if (score === 'N') {
                message = 'The sentiment of the text is negative.';
            } else if (score === 'NEU') {
                message = 'The sentiment of the text is neutral.';
            } else {
                message = 'Unable to determine the sentiment of the text.';
            }
            
            return { success: true, message: message };
        } catch (error) {
            console.error(error);
            return { success: false, message: 'Error analyzing sentiment' };
        }
    }
};
export default plugin;