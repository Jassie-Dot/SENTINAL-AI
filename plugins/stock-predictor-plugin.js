import fs from 'fs';
import axios from 'axios';

const plugin = {
    name: 'Plugin_7468m',
    version: '1.0.0',
    description: 'stock predictor',

    async initialize() { 
        console.log('[stock predictor] Initialized'); 
    },

    canHandle(intent, userInput) { 
        const keywords = ['stock', 'stock predictor'];
        return keywords.some(k => userInput.toLowerCase().includes(k.toLowerCase()));
    },

    async handle(intent, userInput, context) {
        try {
            const response = await axios.get(`https://www.alphavantage.co/query?function=FORECAST&symbol=${userInput}&apikey=YOUR_API_KEY`);
            const data = response.data;
            const result = data['Forecast']['1. close'];
            return { success: true, message: `Predicted closing price for ${userInput}: ${result}` };
        } catch (error) {
            console.error(error);
            return { success: false, message: 'Failed to fetch data' };
        }
    }
};

export default plugin;