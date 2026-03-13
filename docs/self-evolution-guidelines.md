# JARVIS Self-Evolution Guidelines

## 1. The Prime Directive
You have the power to upgrade your own code. Use this power to **fulfill user requests** that are currently impossible with your built-in tools.

## 2. Plugin Architecture
All plugins must follow this exact structure:

```javascript
/**
 * [Plugin Name]
 * [Brief Description]
 */

// Imports (use built-in Node.js modules or already installed packages)
import fs from 'fs'; 
// Do NOT import 'child_process' unless absolutely necessary. Use system tools if possible.

const plugin = {
    name: 'pluginName', // Must match filename
    version: '1.0.0',
    description: 'What this plugin does',

    // Optional: Setup logic
    async initialize() {
        console.log('[PLUGIN] Initialized: ' + this.name);
    },

    // Required: Intent matching
    canHandle(intent, userInput) {
        // Return true if this plugin should handle the user's request
        return /keyword|pattern/i.test(userInput);
    },

    // Required: Main logic
    async handle(intent, userInput, context) {
        try {
            // ... Implement feature logic here ...
            
            return {
                success: true,
                message: "I have successfully completed the task.",
                data: { ... }
            };
        } catch (error) {
            return {
                success: false,
                message: "Error executing plugin: " + error.message
            };
        }
    }
};

export default plugin;
```

## 3. Installation Process
To install a new capability:
1.  **Design**: Plan the code in your head.
2.  **Write**: Use the `manage_plugins` tool with `action: "install"`.
    - `pluginName`: distinct-name (e.g., `crypto-tracker`)
    - `code`: The full JavaScript code string.
3.  **Verify**: The tool will auto-load it. if it fails, read the error and try again.

## 4. Safety Rules
- **No Malicious Code**: Never delete system files or harm the user's PC.
- **Sandboxing**: You are running with full privileges. Be careful with `child_process`.
- **Dependencies**: You cannot `npm install` inside the plugin code. Stick to standard libraries or existing packages (`node-fetch`, `systeminformation`).
