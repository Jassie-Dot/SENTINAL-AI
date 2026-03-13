/**
 * System Monitor Plugin for SENTINAL
 * Real-time system metrics and monitoring
 */

import si from 'systeminformation';

const plugin = {
    name: 'SystemMonitor',
    version: '1.0.0',
    description: 'Real-time system metrics collection and monitoring',
    metrics: {},
    monitoringInterval: null,

    async initialize() {
        // Start collecting metrics every 5 seconds
        this.startMonitoring();
        console.log('[SYSTEM-MONITOR] Plugin initialized with real-time monitoring');
    },

    async cleanup() {
        this.stopMonitoring();
        console.log('[SYSTEM-MONITOR] Plugin cleanup complete');
    },

    startMonitoring() {
        this.updateMetrics(); // Initial update

        // Update metrics every 5 seconds
        this.monitoringInterval = setInterval(() => {
            this.updateMetrics();
        }, 5000);
    },

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    },

    async updateMetrics() {
        try {
            const [cpu, mem, disk, network, temp] = await Promise.all([
                si.currentLoad(),
                si.mem(),
                si.fsSize(),
                si.networkStats(),
                si.cpuTemperature()
            ]);

            this.metrics = {
                cpu: {
                    usage: Math.round(cpu.currentLoad),
                    cores: cpu.cpus?.map(c => Math.round(c.load)) || []
                },
                memory: {
                    total: Math.round(mem.total / 1024 / 1024 / 1024), // GB
                    used: Math.round(mem.used / 1024 / 1024 / 1024), // GB
                    free: Math.round(mem.free / 1024 / 1024 / 1024), // GB
                    usagePercent: Math.round((mem.used / mem.total) * 100)
                },
                disk: disk.map(d => ({
                    mount: d.mount,
                    total: Math.round(d.size / 1024 / 1024 / 1024), // GB
                    used: Math.round(d.used / 1024 / 1024 / 1024), // GB
                    usagePercent: Math.round(d.use)
                })),
                network: network.map(n => ({
                    interface: n.iface,
                    rx: Math.round(n.rx_sec / 1024), // KB/s
                    tx: Math.round(n.tx_sec / 1024)  // KB/s
                })),
                temperature: temp.main || 0,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('[SYSTEM-MONITOR] Error updating metrics:', error.message);
        }
    },

    async getMetrics() {
        if (!this.metrics.timestamp) {
            await this.updateMetrics();
        }
        return this.metrics;
    },

    canHandle(intent, userInput) {
        return intent === 'system.status' ||
            /system status|performance|cpu|memory|ram|disk|metrics|resources/i.test(userInput);
    },

    async handle(intent, userInput, context) {
        try {
            const metrics = await this.getMetrics();

            const message = `System Status Report, Sir:

CPU: ${metrics.cpu.usage}% utilization
Memory: ${metrics.memory.used}GB / ${metrics.memory.total}GB (${metrics.memory.usagePercent}% used)
${metrics.temperature > 0 ? `Temperature: ${metrics.temperature}°C\n` : ''}
Primary Disk: ${metrics.disk[0]?.usagePercent || 'N/A'}% used

${this.getSystemAdvice(metrics)}`;

            return {
                success: true,
                message: message.trim(),
                data: metrics
            };
        } catch (error) {
            console.error('[SYSTEM-MONITOR] Error:', error.message);
            return {
                success: false,
                message: "Unable to retrieve system metrics, Sir. Diagnostic sensors may be offline."
            };
        }
    },

    getSystemAdvice(metrics) {
        const advice = [];

        if (metrics.cpu.usage > 80) {
            advice.push("⚠️ CPU utilization is high. Consider closing unnecessary applications.");
        }

        if (metrics.memory.usagePercent > 85) {
            advice.push("⚠️ Memory usage is elevated. You may experience slowdowns.");
        }

        if (metrics.disk[0]?.usagePercent > 90) {
            advice.push("⚠️ Disk space is running low. Cleanup recommended.");
        }

        if (metrics.temperature > 75) {
            advice.push("⚠️ Temperature is above normal. Ensure proper ventilation.");
        }

        if (advice.length === 0) {
            return "All systems operating within normal parameters.";
        }

        return advice.join('\n');
    }
};

export default plugin;
