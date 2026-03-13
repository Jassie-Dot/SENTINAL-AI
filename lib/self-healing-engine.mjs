/**
 * ====================================
 * SENTINAL SELF-HEALING ENGINE
 * ====================================
 * Autonomous debugging and automated maintenance.
 * Monitors logs for errors and uses AI to generate fixes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class SelfHealingEngine {
    constructor(aiHandler, pluginLoader) {
        this.aiHandler = aiHandler;
        this.pluginLoader = pluginLoader;
        this.errorLog = [];
        this.isHealing = false;
        this.monitoring = false;
        this.faultThreshold = 3; // Errors before auto-quarantine
    }

    /**
     * Start monitoring system logs for errors
     */
    startMonitoring() {
        if (this.monitoring) return;
        this.monitoring = true;
        console.log('[HEALING] Autonomous log monitoring active.');

        // Intercept console.error to catch runtime errors
        const originalError = console.error;
        console.error = (...args) => {
            originalError.apply(console, args);
            this._handleError(args.join(' '));
        };
    }

    async _handleError(errorMessage) {
        // Ignore known non-critical warnings
        if (errorMessage.includes('ExperimentalWarning') || errorMessage.includes('DeprecationWarning')) return;

        console.log(`[HEALING] Detected anomaly: "${errorMessage.slice(0, 100)}..."`);
        this.errorLog.push({ timestamp: new Date(), message: errorMessage });

        // Auto-Quarantine Logic for Plugins
        if (this.pluginLoader) {
            const pluginMatch = errorMessage.match(/\[PLUGIN\] Error in ([^.]+)\.handle/i) ||
                errorMessage.match(/plugin ([a-zA-Z0-9-]+) failed/i) ||
                errorMessage.match(/Error in plugin ([a-zA-Z0-9-]+)/i);

            if (pluginMatch) {
                const pluginName = pluginMatch[1];
                const pluginErrors = this.errorLog.filter(e => e.message.includes(pluginName));

                if (pluginErrors.length >= this.faultThreshold) {
                    console.log(`\n[HEALING] CRITICAL: Plugin '${pluginName}' has faulted repeatedly. Initiating AUTO-QUARANTINE Protocol.`);
                    await this.pluginLoader.unloadPlugin(pluginName);

                    // Clear errors for this plugin to prevent re-triggering
                    this.errorLog = this.errorLog.filter(e => !e.message.includes(pluginName));

                    // Optionally notify via memory or global objects
                    if (global.sentinalMemory) {
                        global.sentinalMemory.facts.push({
                            fact: `The SENTINAL plugin '${pluginName}' was disabled due to instability.`,
                            timestamp: new Date().toISOString(),
                            confidence: 1.0
                        });
                    }
                    return; // Skip normal healing cycle since we neutralized the threat
                }
            }
        }

        // If we have a critical mass or specific error, trigger healing analysis
        if (!this.isHealing && (this.errorLog.length > 5 || errorMessage.includes('Error'))) {
            await this.performHealingCycle(errorMessage);
        }
    }

    async performHealingCycle(lastError) {
        if (this.isHealing || this.aiHandler.currentProvider === 'offline') return;

        this.isHealing = true;
        console.log('[HEALING] Starting autonomous diagnostic cycle...');

        try {
            const prompt = `I have encountered the following error in the SENTINAL Mark IV system:
"${lastError}"

Please analyze this error and provide:
1. A brief explanation of the cause.
2. A code fix or configuration change if possible.
3. Steps to prevent recurrence.

Keep it concise and technical.`;

            let diagnosis = "";
            const result = await this.aiHandler.generateResponse(
                [{ role: 'user', content: prompt }],
                null,
                (token) => diagnosis += token,
                null,
                false // Background healing is low priority
            );

            if (result !== null) {
                console.log('\n[HEALING] AI DIAGNOSIS:\n' + diagnosis + '\n');
                // In a future update, we could apply common fixes automatically here
                // For now, we log the fix and notify of autonomous awareness
            }

        } catch (e) {
            console.warn('[HEALING] Diagnostic cycle failed:', e.message);
        } finally {
            this.isHealing = false;
            this.errorLog = []; // Reset after attempt
        }
    }

    getHealthReport() {
        return {
            status: this.isHealing ? 'healing' : 'monitoring',
            recentErrors: this.errorLog.length,
            lastError: this.errorLog[this.errorLog.length - 1] || null
        };
    }
}

export default SelfHealingEngine;
