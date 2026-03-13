/**
 * ====================================
 * SENTINAL SYSTEM DIAGNOSTICS
 * ====================================
 * Real-time hardware monitoring and health analysis.
 * Uses 'systeminformation' for true PC awareness.
 */

import si from 'systeminformation';

export class SystemDiagnostics {
    constructor() {
        this.history = [];
        this.maxHistory = 60; // Keep 1 hour of minute-by-minute data
        this.monitorInterval = null;
        this.lastLoad = 0;
    }

    /**
     * Get a full system health snapshot
     */
    async getFullSnapshot() {
        try {
            const [cpu, mem, battery, temp, os, load] = await Promise.all([
                si.cpu(),
                si.mem(),
                si.battery(),
                si.cpuTemperature(),
                si.osInfo(),
                si.currentLoad()
            ]);

            return {
                cpu: {
                    manufacturer: cpu.manufacturer,
                    brand: cpu.brand,
                    cores: cpu.cores,
                    speed: cpu.speed,
                    load: Math.round(load.currentLoad),
                    temp: temp.main || 0
                },
                memory: {
                    total: Math.round(mem.total / 1024 / 1024 / 1024 * 100) / 100, // GB
                    used: Math.round(mem.used / 1024 / 1024 / 1024 * 100) / 100,
                    percent: Math.round((mem.used / mem.total) * 100)
                },
                battery: {
                    hasBattery: battery.hasBattery,
                    percent: battery.percent,
                    isCharging: battery.isCharging
                },
                os: {
                    platform: os.platform,
                    distro: os.distro,
                    uptime: Math.round(os.uptime / 3600) // Hours
                },
                status: this._deriveStatus(load.currentLoad, temp.main, mem.used / mem.total)
            };
        } catch (e) {
            console.error('[DIAGNOSTICS] Failed to fetch data:', e.message);
            return null;
        }
    }

    /**
     * Derive a human-readable status for SENTINAL to report
     */
    _deriveStatus(cpuLoad, temp, memPercent) {
        if (cpuLoad > 90 || temp > 85) return 'critical';
        if (cpuLoad > 70 || temp > 75 || memPercent > 0.85) return 'warning';
        return 'healthy';
    }

    /**
     * Get brief summary for AI context
     */
    async getAISummary() {
        const snap = await this.getFullSnapshot();
        if (!snap) return "System diagnostics unavailable.";

        let summary = `SYSTEM HEALTH: ${snap.status.toUpperCase()}\n`;
        summary += `- CPU Load: ${snap.cpu.load}% (${snap.cpu.temp}°C)\n`;
        summary += `- Memory: ${snap.memory.used}GB / ${snap.memory.total}GB (${snap.memory.percent}%)\n`;

        if (snap.battery.hasBattery) {
            summary += `- Battery: ${snap.battery.percent}% (${snap.battery.isCharging ? 'Charging' : 'Discharging'})\n`;
        }

        if (snap.status !== 'healthy') {
            summary += `! ALERT: System is under strain. Suggest background task yielding.`;
        }

        return summary;
    }

    /**
     * Start continuous background monitoring for proactive alerts
     */
    startMonitoring(io) {
        if (this.monitorInterval) clearInterval(this.monitorInterval);

        console.log('[DIAGNOSTICS] Proactive system monitoring online');

        this.monitorInterval = setInterval(async () => {
            const snap = await this.getFullSnapshot();
            if (!snap) return;

            const currentLoad = snap.cpu.load;

            // Detect sudden massive CPU spikes (e.g. jumping by 40%+)
            // DISABLED BY USER REQUEST
            /*
            if (this.lastLoad > 0 && (currentLoad - this.lastLoad > 40)) {
                const msg = `Sir, detecting a sudden massive spike in CPU utilization, currently at ${currentLoad} percent.`;
                console.log(`[PROACTIVE ALERT] ${msg}`);

                if (io) {
                    io.emit("chat:response", { message: msg, source: "proactive" });
                    io.emit("tts:speak", { text: msg });
                }
            }
            */

            // Detect critical memory
            if (snap.memory.percent > 95 && Math.random() < 0.2) {
                const msg = `Warning: System memory is at critical capacity, ${snap.memory.percent} percent utilized.`;
                console.log(`[PROACTIVE ALERT] ${msg}`);

                if (io) {
                    io.emit("chat:response", { message: msg, source: "proactive" });
                    io.emit("tts:speak", { text: msg });
                }
            }

            this.lastLoad = currentLoad;
        }, 15000); // Check every 15 seconds
    }
}

export default SystemDiagnostics;
