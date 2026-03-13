/**
 * SENTINAL System Health Plugin (Evolved)
 * Provides real-time hardware diagnostics via SystemDiagnostics engine.
 */

const plugin = {
    name: 'system-health',
    version: '1.5.0',
    description: 'Hardware diagnostics and PC health monitoring',

    async initialize() {
        console.log('[SYSTEM-HEALTH] Hardware interface online');
    },

    canHandle(intent, userInput) {
        return intent === 'system.status' ||
            userInput.toLowerCase().includes('battery') ||
            userInput.toLowerCase().includes('cpu') ||
            userInput.toLowerCase().includes('ram') ||
            userInput.toLowerCase().includes('memory usage');
    },

    async handle(intent, userInput, context) {
        if (!global.sentinalDiagnostics) {
            return { success: false, message: "Diagnostics engine is offline, Sir." };
        }

        const snapshot = await global.sentinalDiagnostics.getFullSnapshot();
        if (!snapshot) return { success: false, message: "Error fetching hardware telemetry." };

        let message = `System status is currently **${snapshot.status.toUpperCase()}**. `;
        message += `CPU is at **${snapshot.cpu.load}%** (${snapshot.cpu.temp}°C). `;
        message += `Memory usage is at **${snapshot.memory.percent}%** (${snapshot.memory.used}GB/${snapshot.memory.total}GB used). `;

        if (snapshot.battery.hasBattery) {
            message += `Battery: **${snapshot.battery.percent}%** (${snapshot.battery.isCharging ? 'Charging' : 'Discharging'}). `;
        }

        if (snapshot.status === 'warning') {
            message += "\n\nWarning: I detect some thermal or processing strain. You might want to close heavy applications.";
        }

        return {
            success: true,
            message,
            data: snapshot
        };
    }
};

export default plugin;
