/**
 * Media Control Plugin
 * Controls system media playback and volume using PowerShell/Native calls.
 */

import { exec } from 'child_process';

const plugin = {
    name: 'Media Control',
    version: '1.0.0',
    description: 'System-wide media and volume control.',

    initialize() {
        console.log('[MEDIA] Media Control System Online');
    },

    commands: {
        playpause: '(New-Object -ComObject WScript.Shell).SendKeys(String.fromCharCode(179))',
        next: '(New-Object -ComObject WScript.Shell).SendKeys(String.fromCharCode(176))',
        prev: '(New-Object -ComObject WScript.Shell).SendKeys(String.fromCharCode(177))',
        stop: '(New-Object -ComObject WScript.Shell).SendKeys(String.fromCharCode(178))',
        vol_up: '(New-Object -ComObject WScript.Shell).SendKeys(String.fromCharCode(175))',
        vol_down: '(New-Object -ComObject WScript.Shell).SendKeys(String.fromCharCode(174))',
        mute: '(New-Object -ComObject WScript.Shell).SendKeys(String.fromCharCode(173))'
    },

    canHandle(intent, userInput) {
        return (
            intent.startsWith('media.') ||
            userInput.match(/\b(play|pause|stop|next|previous|volume|mute|unmute|turn up|turn down)\b/i)
        );
    },

    async handle(intent, userInput, context) {
        let action = null;
        const text = userInput.toLowerCase();

        if (text.includes('play') || text.includes('pause')) action = 'playpause';
        else if (text.includes('next') || text.includes('skip')) action = 'next';
        else if (text.includes('previous') || text.includes('back')) action = 'prev';
        else if (text.includes('stop')) action = 'stop';
        else if (text.includes('mute') || text.includes('unmute')) action = 'mute';
        else if (text.includes('volume up') || text.includes('turn up') || text.includes('louder')) action = 'vol_up';
        else if (text.includes('volume down') || text.includes('turn down') || text.includes('quieter')) action = 'vol_down';

        if (action && this.commands[action]) {
            // PowerShell execution wrapper
            const psCommand = `powershell -Command "${this.commands[action]}"`;

            return new Promise((resolve) => {
                exec(psCommand, (err) => {
                    if (err) {
                        resolve({ success: false, message: "Failed to execute media command." });
                    } else {
                        resolve({
                            success: true,
                            message: `Media command executed: ${action}`,
                            data: { action }
                        });
                    }
                });
            });
        }

        return { success: false, message: "I'm not sure which media control you want." };
    }
};

export default plugin;
