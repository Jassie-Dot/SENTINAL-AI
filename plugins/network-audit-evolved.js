/**
 * SENTINAL Network Audit Plugin (Evolved)
 * Provides legitimate network diagnostic and security auditing tools.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const plugin = {
    name: 'network-audit',
    version: '1.2.0',
    description: 'Legitimate network auditing and discovery tools',

    async initialize() {
        console.log('[NETWORK-AUDIT] Security tools standby');
    },

    canHandle(intent, userInput) {
        const keywords = ['ping', 'network scan', 'whois', 'nslookup', 'ip address', 'trace route'];
        return intent === 'security.activate' || keywords.some(k => userInput.toLowerCase().includes(k));
    },

    async handle(intent, userInput, context) {
        const input = userInput.toLowerCase();

        try {
            // 1. Get My IP
            if (input.includes('my ip') || input.includes('my address')) {
                const { stdout } = await execAsync('ipconfig'); // Windows
                const match = stdout.match(/IPv4 Address[ .]*: ([\d.]+)/);
                return { success: true, message: `Your local IP address is **${match ? match[1] : 'Unknown'}**.` };
            }

            // 2. Ping
            if (input.includes('ping')) {
                const target = input.split('ping ')[1]?.trim() || 'google.com';
                const { stdout } = await execAsync(`ping -n 4 ${target}`);
                return { success: true, message: `Ping report for **${target}**:\n\`\`\`\n${stdout}\n\`\`\`` };
            }

            // 3. Network Discovery (Mocked scan for safety, or netstat)
            if (input.includes('scan') || input.includes('connections')) {
                const { stdout } = await execAsync('netstat -an | findstr ESTABLISHED');
                return {
                    success: true,
                    message: "Active network connections established:\n```\n" + stdout.slice(0, 500) + "...\n```",
                    data: { raw: stdout }
                };
            }

            return { success: true, message: "Security module is active. Are you looking to ping a target or check your local connections?" };

        } catch (error) {
            return { success: false, message: `Audit tool failed: ${error.message}` };
        }
    }
};

export default plugin;
