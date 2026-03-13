import { createRequire } from 'moduleconst require = createRequire(import.meta.url);
 math from 'mathjsimport axios from 'axios';

const plugin = {
    name 'advanced-math-solver',
    version: '1.0.0',
    description 'Solve complex mathematical equations and proofs. Uses MathJS for calculations. No API keys required.',
    
    async initialize {
        console.log('[advanced-math-s] Plugin online');
 },
    
    canHandle(intent, userInput) {
        const keywords = ['solve', 'prove', 'math', 'equation', 'proof', 'derivative', 'integral'];
        return keywords.some(k => userInput.toLowerCase().includes(k));
    },
    
    async handle(intent, userInput, context) {
        try {
            let equation = userInput.replace(/solve|prove|math|equation|proof|derivative|integral/gi, '').trim();
            let result;

            if (context && context.lastEquation) {
                equation = context.lastEquation + ' = ' + equation;
            }

            if (userInput.toLowerCase().includes('derivative')) {
                result = math.derivative(equation);
            } else if (userInput.toLowerCase().includes('integral')) {
                result = math.integral(equation);
            } else {
                result = math.evaluate(equation);
            }

            if (result === undefined || result === null) {
                return { success: false, message: 'Invalid equation' };
            }

            return { success: true, message: `Result: ${result}` };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
};
export default plugin;