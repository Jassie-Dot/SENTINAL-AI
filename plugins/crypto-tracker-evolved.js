import fs from 'fs';
import axios from 'axios';

const plugin = {
    name: 'crypto-tracker',
    version: '1.0.0',
    description: 'Track real-time cryptocurrency prices and trends. Requires API key from CoinGecko (https://www.coingecko.com/en/api). Set COINGECKO_API_KEY environment variable.',
    
    async initialize() {
        console.log('[crypto-tracker] Plugin online');
    },
    
    canHandle(intent, userInput) {
        const keywords = ['bitcoin', 'ethereum', 'crypto', 'cryptocurrency', 'price', 'trend'];
        return keywords.some(k => userInput.toLowerCase().includes(k));
    },
    
    async handle(intent, userInput, context) {
        try {
            const coin = userInput.toLowerCase().replace(/[^a-z]/g, '');
            const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coin}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);
            if (response.status === 200) {
                const data = response.data;
                const price = data.market_data.current_price.usd;
                const trend = data.market_data.price_change_percentage_24h;
                if (context && context.previousCoin) {
                    const previousPrice = context.previousPrice;
                    const difference = price - previousPrice;
                    return { success: true, message: `The current price of ${coin} is $${price}. The price has changed by $${difference} (${trend}%).` };
                } else {
                    return { success: true, message: `The current price of ${coin} is $${price}. The price has changed by ${trend}% in the last 24 hours.` };
                }
            } else {
                return { success: false, message: 'Failed to retrieve data' };
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
};
export default plugin;