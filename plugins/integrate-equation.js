import fetch from 'node-fetch';

const plugin = {
    name: 'integrate-equation',
    version: '1.0.0',
    initialize() { 
        console.log('[PLUGIN] integrate-equation loaded'); 
    },
    canHandle(intent, text) { 
        return /integrate|integral|\∫/i.test(text); 
    },
    async handle(intent, text, context) {
        try {
            const expressionMatch = text.match(/integrate|integral|\∫\s+(.+)/i);
            if (!expressionMatch) {
                return { 
                    success: false, 
                    message: "Please provide an expression to integrate. Usage: integrate x^2 dx" 
                };
            }

            const expression = expressionMatch[1].trim();
            
            const apiUrl = `http://api.wolframalpha.com/v2/query?input=integrate+${encodeURIComponent(expression)}&appid=${process.env.WOLFRAM_APP_ID}&output=json`;
            
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.queryresult.success) {
                const pods = data.queryresult.pods || [];
                const resultPod = pods.find(pod => pod.id === 'IndefiniteIntegral' || pod.id === 'DefiniteIntegral');
                
                if (resultPod && resultPod.subpods && resultPod.subpods.length > 0) {
                    const result = resultPod.subpods[0].plaintext;
                    return {
                        success: true,
                        message: `Integration result: ${result}`,
                        data: {
                            expression: expression,
                            result: result,
                            source: 'Wolfram Alpha'
                        }
                    };
                } else {
                    return {
                        success: false,
                        message: "Could not find integration result in the response."
                    };
                }
            } else {
                return {
                    success: false,
                    message: "Integration failed. Please check your expression and try again."
                };
            }
        } catch (error) {
            console.error('Integration error:', error);
            return {
                success: false,
                message: "Error performing integration. Please try again."
            };
        }
    }
};

export default plugin;