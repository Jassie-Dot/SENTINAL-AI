import fs from 'fs';
import path from 'path';

const REVIEWABLE_EXTENSIONS = /\.(cjs|css|go|html|java|js|json|jsx|mjs|py|rs|ts|tsx)$/i;

function extractPath(userInput = '', context = {}) {
    if (context?.path) {
        return path.resolve(context.path);
    }

    const quoted = userInput.match(/["']([^"']+\.[A-Za-z0-9]+)["']/);
    if (quoted) {
        return path.resolve(quoted[1]);
    }

    const direct = userInput.match(/([A-Za-z]:\\[^\s'"]+|\.{0,2}[\\/][^\s'"]+|[^\s'"]+\.[A-Za-z0-9]+)/);
    if (direct) {
        return path.resolve(direct[1]);
    }

    return null;
}

function reviewSource(source) {
    const findings = [];
    const lines = source.split(/\r?\n/);

    lines.forEach((line, index) => {
        const lineNumber = index + 1;

        if (line.length > 140) {
            findings.push(`Line ${lineNumber}: exceeds 140 characters.`);
        }
        if (/\bvar\b/.test(line)) {
            findings.push(`Line ${lineNumber}: replace "var" with "const" or "let".`);
        }
        if (/console\.log\(/.test(line)) {
            findings.push(`Line ${lineNumber}: remove debug logging before shipping.`);
        }
        if (/\bdebugger\b/.test(line)) {
            findings.push(`Line ${lineNumber}: debugger statement left in code.`);
        }
        if (/TODO|FIXME/i.test(line)) {
            findings.push(`Line ${lineNumber}: unresolved TODO/FIXME marker.`);
        }
        if (/catch\s*\([^)]*\)\s*{\s*}/.test(line)) {
            findings.push(`Line ${lineNumber}: empty catch block hides failures.`);
        }
    });

    return findings;
}

const plugin = {
    name: 'code-reviewer',
    version: '1.1.0',
    description: 'Performs a lightweight code review over a local file.',

    async initialize() {
        console.log('[code-reviewer] Plugin online');
    },

    canHandle(intent, userInput) {
        return /\b(review code|check code quality|improve code|review file)\b/i.test(userInput);
    },

    async handle(intent, userInput, context = {}) {
        const targetPath = extractPath(userInput, context);
        if (!targetPath) {
            return { success: false, message: 'Provide a file path to review.' };
        }

        if (!REVIEWABLE_EXTENSIONS.test(targetPath)) {
            return { success: false, message: 'That file type is not supported for review.' };
        }

        try {
            const source = await fs.promises.readFile(targetPath, 'utf8');
            const findings = reviewSource(source);

            if (!findings.length) {
                return {
                    success: true,
                    message: `No obvious issues found in ${path.basename(targetPath)}.`
                };
            }

            return {
                success: true,
                message: findings.slice(0, 12).join('\n')
            };
        } catch (error) {
            return { success: false, message: `Error reviewing code: ${error.message}` };
        }
    }
};

export default plugin;
