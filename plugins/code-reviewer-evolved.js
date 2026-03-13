import fs 'fs';
import { ESLint } from 'eslint';
import { exec } from 'child_process';

const plugin = {
    name: 'code-reviewer',
    version: '1.0.0',
    description: 'Review and improve code quality with suggestions. This plugin uses ESLint to check code quality. To use this plugin, you need to have ESLint installed globally or locally in your project.',
    
    async initialize() {
        console.log('[code-reviewer] Plugin online');
    },
    
    canHandle(intent, userInput) {
        const keywords = ['review code', 'check code quality', 'improve code'];
        return keywords.some(k => userInput.toLowerCase().includes(k));
    },
    
    async handle(intent, userInput, context) {
        if (context.path) {
            try {
                const eslint = new ESLint({
                    fix: false,
                    ignore: false,
                    cache: false,
                    cacheLocation: './.eslintcache',
                });

                const results = await eslint.lint([context.path]);

                const messages = results[0].messages;

                if (messages.length > 0) {
                    const suggestions = messages.map(message => {
                        return `${message.message} at line ${message.line}, column ${message.column}`;
                    });

                    return { success: true, message: suggestions.join('\n') };
                } else {
                    return { success: true, message: 'No issues found in the code' };
                }
            } catch (error) {
                return { success: false, message: 'Error reviewing code: ' + error.message };
            }
        } else {
            return { success: false, message: 'Please provide a file path to review' };
        }
    }
};
export default plugin;