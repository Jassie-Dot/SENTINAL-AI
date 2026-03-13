/**
 * UI Automation Plugin for SENTINAL
 * Enables interaction with Windows UI elements (buttons, inputs, etc.)
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const plugin = {
    name: 'UIAutomation',
    version: '1.0.0',
    description: 'Direct control of Windows UI elements via UIA',

    async initialize() {
        console.log('[UIA-PLUGIN] Plugin initialized');
    },

    canHandle(intent, userInput) {
        return /click|type|find element|ui automation|inspect window/i.test(userInput) || /click|type|ui automation/i.test(intent);
    },

    async handle(intent, userInput, context) {
        const input = userInput.toLowerCase();

        if (input.includes('click')) {
            const target = userInput.match(/click\s+(?:on\s+)?["']?(.+?)["']?$/i)?.[1];
            if (target) return await this.clickElement(target);
        }

        if (input.includes('type')) {
            const match = userInput.match(/type\s+["']?(.+?)["']?\s+in\s+["']?(.+?)["']?$/i);
            if (match) return await this.typeIntoElement(match[2], match[1]);
        }

        if (input.includes('focus window')) {
            const match = userInput.match(/focus window\s+["']?(.+?)["']?$/i);
            if (match) return await this.focusWindow(match[1]);
        }

        return { success: false, message: "UIA command not recognized or missing parameters, Sir." };
    },

    async focusWindow(title) {
        const script = `
            Add-Type @"
                using System;
                using System.Runtime.InteropServices;
                public class Win32 {
                    [DllImport("user32.dll")]
                    public static extern bool SetForegroundWindow(IntPtr hWnd);
                    [DllImport("user32.dll")]
                    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
                }
"@
            $proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*${title}*" } | Select-Object -First 1
            if ($proc) {
                $hwnd = $proc.MainWindowHandle
                [Win32]::ShowWindow($hwnd, 9) # SW_RESTORE
                [Win32]::SetForegroundWindow($hwnd)
                "Focused ${title}"
            } else {
                Throw "Window with title matching ${title} not found"
            }
        `;
        try {
            await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`);
            return { success: true, message: `Focused window: ${title}, Sir.` };
        } catch (e) {
            return { success: false, message: `Failed to focus window ${title}: ${e.message}` };
        }
    },

    async waitForWindow(title, timeout = 10000) {
        const script = `
            $title = "${title}"
            $timeout = ${timeout}
            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            while ($sw.ElapsedMilliseconds -lt $timeout) {
                $proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*$title*" } | Select-Object -First 1
                if ($proc) { return $true }
                Start-Sleep -Milliseconds 500
            }
            return $false
        `;
        try {
            const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`);
            const found = stdout.trim() === 'True';
            return { success: found, message: found ? `Window ${title} is ready.` : `Timed out waiting for ${title}.` };
        } catch (e) {
            return { success: false, message: `Error waiting for window: ${e.message}` };
        }
    },

    async clickElement(name) {
        const script = `
            Add-Type -AssemblyName UIAutomationClient
            Add-Type -AssemblyName UIAutomationTypes
            $ae = [System.Windows.Automation.AutomationElement]::RootElement.FindFirst(
                [System.Windows.Automation.TreeScope]::Descendants,
                [System.Windows.Automation.PropertyCondition]::new(
                    [System.Windows.Automation.AutomationElement]::NameProperty,
                    "${name}"
                )
            )
            if ($ae) {
                $invoke = $ae.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
                $invoke.Invoke()
                "Clicked ${name}"
            } else {
                Throw "Element ${name} not found"
            }
        `;
        try {
            await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`);
            return { success: true, message: `Successfully clicked on ${name}, Sir.` };
        } catch (e) {
            return { success: false, message: `Failed to click ${name}: ${e.message}` };
        }
    },

    async typeIntoElement(name, text) {
        // Escape special chars for SendKeys and PowerShell
        const escapedText = text
            .replace(/"/g, '`"')
            .replace(/\n/g, '{ENTER}')
            .replace(/\r/g, '')
            .replace(/([%+^~{}()[\]])/g, '{$1}');

        const script = `
            Add-Type -AssemblyName UIAutomationClient
            Add-Type -AssemblyName UIAutomationTypes
            $ae = [System.Windows.Automation.AutomationElement]::RootElement.FindFirst(
                [System.Windows.Automation.TreeScope]::Descendants,
                [System.Windows.Automation.PropertyCondition]::new(
                    [System.Windows.Automation.AutomationElement]::NameProperty,
                    "${name}"
                )
            )
            if ($ae) {
                $ae.SetFocus()
                Start-Sleep -Milliseconds 200
                [System.Windows.Forms.SendKeys]::SendWait("${escapedText}")
                "Typed into ${name}"
            } else {
                // Fallback: If no element named $name, just try sending keys directly (assuming focus is correct)
                [System.Windows.Forms.SendKeys]::SendWait("${escapedText}")
                "Typed globally (fallback)"
            }
        `;
        try {
            const finalScript = `Add-Type -AssemblyName System.Windows.Forms; ${script}`;
            await execAsync(`powershell -Command "${finalScript.replace(/\n/g, ' ')}"`);
            return { success: true, message: `Typed text into ${name || 'focused element'}, Sir.` };
        } catch (e) {
            return { success: false, message: `Failed to type: ${e.message}` };
        }
    }
};

export default plugin;
