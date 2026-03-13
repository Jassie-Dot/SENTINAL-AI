/**
 * System Control Plugin for SENTINAL
 * Provides advanced system controls: Volume, Media, Power, Screen
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const plugin = {
    name: 'SystemControl',
    version: '1.0.0',
    description: 'Advanced system control (Volume, Media, Power, Display)',

    async initialize() {
        console.log('[SYSTEM-CONTROL] Plugin initialized');
    },

    canHandle(intent, userInput) {
        const pattern = /(volume|mute|unmute|sound|audio|music|media|play|pause|next|previous|track|song|brightness|screen|monitor|display|shutdown|restart|reboot|lock|log off|sign out|run command|powershell|execute|minimize|maximize|close window|list windows)/i;
        return pattern.test(userInput) || pattern.test(intent);
    },

    async handle(intent, userInput, context) {
        try {
            const input = userInput.toLowerCase();

            // === VOLUME CONTROL ===
            if (input.includes('mute')) return await this.setMute(true);
            if (input.includes('unmute')) return await this.setMute(false);
            if (input.includes('volume')) {
                if (input.includes('up') || input.includes('increase') || input.includes('raise')) return await this.changeVolume(10);
                if (input.includes('down') || input.includes('decrease') || input.includes('lower')) return await this.changeVolume(-10);

                // Set specific volume
                const match = input.match(/volume (?:to |at )?(\d+)/);
                if (match) return await this.setVolume(parseInt(match[1]));
            }

            // === MEDIA CONTROL ===
            if (input.includes('play') || input.includes('resume')) return await this.mediaKey('0xCDAA'); // Play/Pause
            if (input.includes('pause') || input.includes('stop')) return await this.mediaKey('0xCDAA'); // Play/Pause
            if (input.includes('next') || input.includes('skip')) return await this.mediaKey('0xB0'); // Next Track
            if (input.includes('previous') || input.includes('back')) return await this.mediaKey('0xB1'); // Prev Track

            // === POWER CONTROL ===
            if (input.includes('shutdown') || input.includes('power off')) return await this.powerControl('shutdown');
            if (input.includes('restart') || input.includes('reboot')) return await this.powerControl('restart');
            if (input.includes('lock')) return await this.powerControl('lock');

            // === DISPLAY & BRIGHTNESS CONTROL ===
            if (input.includes('screen') || input.includes('monitor') || input.includes('display')) {
                if (input.includes('off')) return await this.monitorControl('off');
                if (input.includes('on') || input.includes('wake')) return await this.monitorControl('on');
            }

            if (input.includes('brightness')) {
                const match = input.match(/(\d+)/);
                if (match) {
                    const level = parseInt(match[1]);
                    return await this.setBrightness(level);
                }
                // Default to max if "brightness max/up" or min if "brightness min/down" implies?
                // For now, let's just ask for a number or default to 100/50
                if (input.includes('max') || input.includes('up')) return await this.setBrightness(100);
                if (input.includes('min') || input.includes('down')) return await this.setBrightness(10);

                return { success: false, message: "Please specify a brightness level (0-100), Sir." };
            }

            // === WINDOW MANAGEMENT ===
            if (input.includes('minimize')) return await this.windowControl('minimize');
            if (input.includes('maximize')) return await this.windowControl('maximize');
            if (input.includes('close window')) return await this.windowControl('close');
            if (input.includes('list windows')) return await this.listWindows();

            // === ARBITRARY COMMAND ===
            if (input.includes('run command') || input.includes('execute') || input.includes('powershell')) {
                const cmdMatch = userInput.match(/(?:run command|execute|powershell)\s+(.+)/i);
                if (cmdMatch) return await this.runCommand(cmdMatch[1]);
            }

            return {
                success: false,
                message: "I understand the request but couldn't map it to a specific system action, Sir."
            };

        } catch (error) {
            console.error('[SYSTEM-CONTROL] Error:', error.message);
            return {
                success: false,
                message: `System control failed: ${error.message}`
            };
        }
    },

    // --- HELPER METHODS ---

    async setMute(mute) {
        // PowerShell script to toggle mute
        const command = `powershell -c "(New-Object -ComObject WScript.Shell).SendKeys(String.fromCharCode(173))"`;
        await execAsync(command);
        return { success: true, message: mute ? "System muted." : "System unmuted." };
    },

    async changeVolume(delta) {
        // Send global volume keys
        const key = delta > 0 ? "175" : "174"; // Vol Up : Vol Down
        const steps = Math.abs(delta / 2); // Approximate steps
        const command = `powershell -c "$w = New-Object -ComObject WScript.Shell; for($i=0;$i -lt ${steps};$i++){$w.SendKeys([char]${key})}"`;
        await execAsync(command);
        return { success: true, message: `Volume ${delta > 0 ? 'increased' : 'decreased'}.` };
    },

    async setVolume(level) {
        const lvl = Math.max(0, Math.min(100, level));
        const command = `powershell -c "$w = New-Object -ComObject WScript.Shell; $v = ${lvl}; (Get-WmiObject -Namespace root/wmi -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, $v)"`;
        // Note: WMI is for brightness. For volume, we need a different approach or just stick to Relative for now.
        // Actually, let's use a common PS snippet for absolute volume if possible, or keep it as is.
        // Better absolute volume requires CoreAudio API or a helper. Let's stick to relative for now but make it smarter.
        return { success: false, message: "I can currently only increase or decrease volume relative to current levels, Sir. Try 'volume up' or 'volume down'." };
    },

    async runCommand(command) {
        try {
            console.log(`[SYSTEM-CONTROL] Executing: ${command}`);
            // Use a slightly longer timeout and better shell handling
            const { stdout, stderr } = await execAsync(`powershell -c "${command.replace(/"/g, '`"')}"`, { timeout: 30000 });
            
            if (stderr && !stdout) {
                return { success: false, message: `Command returned error: ${stderr}`, data: { stderr } };
            }
            
            return { 
                success: true, 
                message: stderr ? `Command executed with warnings.` : `Command executed successfully, Sir.`, 
                data: { stdout, stderr } 
            };
        } catch (error) {
            console.error(`[SYSTEM-CONTROL] Command failed: ${error.message}`);
            return { success: false, message: `Command failed: ${error.message}` };
        }
    },

    async windowControl(action) {
        let script = "";
        if (action === 'minimize') script = "(Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1).CloseMainWindow()"; // Not exactly minimize
        // Real minimize/maximize usually requires User32.dll calls via Add-Type
        script = `
            $code = @'
            [DllImport("user32.dll")]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
            [DllImport("user32.dll")]
            public static extern IntPtr GetForegroundWindow();
'@
            Add-Type -TypeDefinition $code -Namespace Win32 -Name Window
            $hwnd = [Win32.Window]::GetForegroundWindow()
            if ($action -eq 'minimize') { [Win32.Window]::ShowWindow($hwnd, 6) }
            elseif ($action -eq 'maximize') { [Win32.Window]::ShowWindow($hwnd, 3) }
            elseif ($action -eq 'close') { (Get-Process | Where-Object {$_.MainWindowHandle -eq $hwnd}).CloseMainWindow() }
        `.replace('$action', `"${action}"`);

        try {
            await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`);
            return { success: true, message: `Window ${action}d.` };
        } catch (e) {
            return { success: false, message: `Failed to ${action} window: ${e.message}` };
        }
    },

    async listWindows() {
        const command = `powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object Name, MainWindowTitle | ConvertTo-Json"`;
        try {
            const { stdout } = await execAsync(command);
            const windows = JSON.parse(stdout);
            const list = Array.isArray(windows) ? windows.map(w => `${w.Name}: ${w.MainWindowTitle}`).join('\n') : `${windows.Name}: ${windows.MainWindowTitle}`;
            return { success: true, message: `Here are the active windows, Sir:\n${list}`, data: { windows } };
        } catch (e) {
            return { success: false, message: `Failed to list windows: ${e.message}` };
        }
    },

    async setBrightness(level) {
        // Clamp level 0-100
        const lvl = Math.max(0, Math.min(100, level));

        // PowerShell WMI command to set brightness
        const command = `powershell -Command "(Get-WmiObject -Namespace root/wmi -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,${lvl})"`;

        try {
            await execAsync(command);
            return { success: true, message: `Brightness set to ${lvl}%.` };
        } catch (e) {
            console.error(e);
            return { success: false, message: "Failed to set brightness. This feature may not be supported on this monitor/driver." };
        }
    },

    async mediaKey(keyCode) {
        let keyChar;
        if (keyCode === '0xCDAA') keyChar = "179"; // Play/Pause
        if (keyCode === '0xB0') keyChar = "176"; // Next
        if (keyCode === '0xB1') keyChar = "177"; // Prev

        const command = `powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]${keyChar})"`;
        await execAsync(command);
        return { success: true, message: "Media command executed." };
    },

    async powerControl(action) {
        if (action === 'lock') {
            await execAsync('rundll32.exe user32.dll,LockWorkStation');
            return { success: true, message: "Workstation locked." };
        }

        let cmd = '';
        let msg = '';

        if (action === 'shutdown') {
            cmd = 'shutdown /s /t 10';
            msg = "Shutdown sequence initiated (10s).";
        } else if (action === 'restart') {
            cmd = 'shutdown /r /t 10';
            msg = "Restart sequence initiated (10s).";
        }

        if (cmd) {
            // In a real agent, we might auto-execute or ask, here we just execute for "Fix"
            // But let's be safe and just return the message for now unless confirmed?
            // The user said "FIX control", usually implies they want it to WORK.
            // I will executing the command but with a delay (already encoded in /t 10)
            await execAsync(cmd);
            return { success: true, message: `WARNING: ${msg} Say 'shutdown /a' to abort via terminal if needed.` };
        }
        return { success: false, message: "Unknown power command." };
    },

    async monitorControl(action) {
        if (action === 'off') {
            // PowerShell magic to turn off monitor (0x0112, 0xF170, 2)
            const command = `powershell -c "(Add-Type '[DllImport(\\"user32.dll\\")]^public static extern int SendMessage(int hWnd, int hMsg, int wParam, int lParam);' -Name a -PassThru)::SendMessage(-1,0x0112,0xF170,2)"`;
            await execAsync(command);
            return { success: true, message: "Turning off displays." };
        }
        if (action === 'on') {
            // Wake up by simulating a tiny mouse move
            const command = `powershell -c "$c = [System.Windows.Forms.Cursor]; $p = $c::Position; $c::Position = New-Object System.Drawing.Point($p.X + 1, $p.Y); Start-Sleep -Milliseconds 50; $c::Position = $p"`;
            try {
                await execAsync(command);
                return { success: true, message: "Waking up displays." };
            } catch (e) {
                return { success: false, message: "Failed to wake display." };
            }
        }
        return { success: false, message: "Unknown display command" };
    }
};

export default plugin;
