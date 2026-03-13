/**
 * System Info Plugin
 * Handles basic system information queries like Time and Date directly
 */

const plugin = {
    name: 'system-info',
    version: '1.0.0',
    description: 'Provides basic system information (Time, Date)',

    async initialize() {
        console.log('[PLUGIN] System Info Loaded');
    },

    canHandle(intent, userInput) {
        return intent === 'system.time' || intent === 'system.date' || intent === 'system.status';
    },

    async handle(intent, userInput, context) {
        const now = new Date();
        const userName = 'Sir'; // Default, ideally fetch from context if available

        if (intent === 'system.time') {
            return {
                success: true,
                message: `The current time is ${now.toLocaleTimeString()}.`
            };
        }

        if (intent === 'system.date') {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            return {
                success: true,
                message: `Today is ${now.toLocaleDateString('en-US', options)}.`
            };
        }

        if (intent === 'system.status') {
            const os = await import('os');
            const uptime = Math.round(os.uptime() / 3600);
            const freemem = Math.round(os.freemem() / 1024 / 1024 / 1024);
            const totalmem = Math.round(os.totalmem() / 1024 / 1024 / 1024);

            return {
                success: true,
                message: `All systems nominal. Uptime: ${uptime} hours. Memory: ${freemem}GB / ${totalmem}GB available.`
            };
        }

        return { success: false, message: "I cannot handle this system request." };
    }
};

export default plugin;
