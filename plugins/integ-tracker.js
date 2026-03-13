import fetch from 'node-fetch';

const plugin = {
    name: 'integ-tracker',
    version: '1.0.0',
    initialize() { 
        console.log('[PLUGIN] integ-tracker loaded'); 
    },
    canHandle(intent, text) { 
        return /(adv|expert|intelligence)/i.test(text); 
    },
    async handle(intent, text, context) {
        try {
            const response = await fetch('https://api.example.com/advanced-intelligence', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': context?.apiKey ? `Bearer ${context.apiKey}` : ''
                }
            });
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            return { 
                success: true, 
                message: "Advanced intelligence data retrieved successfully",
                data: data
            };
            
        } catch (error) {
            return { 
                success: false, 
                message: `Failed to fetch intelligence data: ${error.message}`,
                data: null
            };
        }
    }
};

export default plugin;