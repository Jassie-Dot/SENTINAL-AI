import axios from 'axios';
import moment from 'moment-timezone';

const plugin = {
    name: 'world-clock',
    version: '1.0.0',
    description: 'Get current time and news for any city worldwide. Requires NEWS_API_KEY and OPENWEATHERMAP_API_KEY environment variables.',
    
    async initialize() {
        console.log('[world-clock] Plugin online');
    },
    
    canHandle(intent, userInput) {
        const keywords = ['time', 'news', 'city', 'worldwide'];
        return keywords.some(k => userInput.toLowerCase().includes(k));
    },
    
    async handle(intent, userInput, context) {
        const city = context.city || userInput.match(/([a-zA-Z\s]+)/g).join(' ');
        const newsApiKey = process.env.NEWS_API_KEY;
        const weatherApiKey = process.env.OPENWEATHERMAP_API_KEY;

        if (!city) {
            return { success: false, message: 'Please specify a city' };
        }

        try {
            const weatherResponse = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${weatherApiKey}`);
            const timezoneOffset = weatherResponse.data.timezone;
            const currentTime = moment().tz(timezoneOffset).format('HH:mm:ss');

            const newsResponse = await axios.get(`https://newsapi.org/v2/everything?q=${city}&apiKey=${newsApiKey}`);
            const newsArticles = newsResponse.data.articles.slice(0, 3);

            return { success: true, message: `Current time in ${city}: ${currentTime}\nNews:\n${newsArticles.map(article => article.title).join('\n')}` };
        } catch (error) {
            return { success: false, message: 'Failed to retrieve data' };
        }
    }
};
export default plugin;