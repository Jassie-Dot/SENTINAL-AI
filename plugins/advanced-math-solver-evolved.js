const MATH_SCOPE = {
    abs: Math.abs,
    acos: Math.acos,
    asin: Math.asin,
    atan: Math.atan,
    ceil: Math.ceil,
    cos: Math.cos,
    exp: Math.exp,
    floor: Math.floor,
    log: Math.log,
    max: Math.max,
    min: Math.min,
    pi: Math.PI,
    pow: Math.pow,
    round: Math.round,
    sin: Math.sin,
    sqrt: Math.sqrt,
    tan: Math.tan,
    e: Math.E,
};

function normalizeExpression(expression = '') {
    return expression
        .toLowerCase()
        .replace(/[=]+/g, '=')
        .replace(/[×x](?=\s*\d)/g, '*')
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/\^/g, '**')
        .replace(/(\d)\s*\(/g, '$1 * (')
        .replace(/(\d)\s*x\b/g, '$1 * x')
        .replace(/\)\s*(\d|x)/g, ') * $1')
        .trim();
}

function assertSafeExpression(expression) {
    if (!expression || !/^[0-9a-z_+\-*/().,\s=]*$/i.test(expression)) {
        throw new Error('Unsupported characters in expression.');
    }
}

function evaluateExpression(expression, x = 0) {
    const normalized = normalizeExpression(expression);
    assertSafeExpression(normalized);

    const evaluator = new Function(
        'scope',
        `with (scope) { return (${normalized}); }`
    );

    const result = evaluator({ ...MATH_SCOPE, x });
    const numeric = Number(result);
    if (!Number.isFinite(numeric)) {
        throw new Error('Expression did not produce a finite number.');
    }

    return numeric;
}

function numericDerivative(expression, x) {
    const h = 1e-5;
    return (evaluateExpression(expression, x + h) - evaluateExpression(expression, x - h)) / (2 * h);
}

function numericIntegral(expression, start, end, steps = 1000) {
    const width = (end - start) / steps;
    let total = 0;

    for (let index = 0; index < steps; index += 1) {
        const left = start + (index * width);
        const right = left + width;
        total += ((evaluateExpression(expression, left) + evaluateExpression(expression, right)) / 2) * width;
    }

    return total;
}

function findRoots(expression) {
    const roots = [];

    for (let guess = -10; guess <= 10; guess += 1) {
        let current = guess;

        for (let iteration = 0; iteration < 30; iteration += 1) {
            const value = evaluateExpression(expression, current);
            const slope = numericDerivative(expression, current);

            if (Math.abs(slope) < 1e-8) {
                break;
            }

            const next = current - (value / slope);
            if (!Number.isFinite(next)) {
                break;
            }

            if (Math.abs(next - current) < 1e-7) {
                current = next;
                break;
            }

            current = next;
        }

        const residual = Math.abs(evaluateExpression(expression, current));
        const duplicate = roots.some(root => Math.abs(root - current) < 1e-4);
        if (residual < 1e-4 && !duplicate && Number.isFinite(current)) {
            roots.push(Number(current.toFixed(6)));
        }
    }

    return roots.sort((left, right) => left - right);
}

function extractExpression(userInput = '') {
    return userInput
        .replace(/\b(solve|calculate|compute|evaluate|math|equation)\b/gi, '')
        .trim();
}

const plugin = {
    name: 'advanced-math-solver',
    version: '1.1.0',
    description: 'Solve equations, evaluate expressions, and approximate derivatives or integrals.',

    async initialize() {
        console.log('[advanced-math-solver] Plugin online');
    },

    canHandle(intent, userInput) {
        return /\b(solve|calculate|compute|evaluate|derivative|differentiate|integral|integrate|equation)\b/i.test(userInput);
    },

    async handle(intent, userInput) {
        try {
            const normalizedInput = userInput.trim();

            const derivativeMatch = normalizedInput.match(/(?:derivative|differentiate)\s+(?:of\s+)?(.+?)(?:\s+at\s+x\s*=\s*([-+]?\d*\.?\d+))?$/i);
            if (derivativeMatch) {
                const expression = derivativeMatch[1];
                const x = Number.parseFloat(derivativeMatch[2] ?? '0');
                const derivative = numericDerivative(expression, x);
                return {
                    success: true,
                    message: `d/dx at x=${x}: ${derivative.toFixed(6)}`
                };
            }

            const integralMatch = normalizedInput.match(/(?:integral|integrate)\s+(?:of\s+)?(.+?)\s+from\s+([-+]?\d*\.?\d+)\s+(?:to|-)\s+([-+]?\d*\.?\d+)/i);
            if (integralMatch) {
                const expression = integralMatch[1];
                const start = Number.parseFloat(integralMatch[2]);
                const end = Number.parseFloat(integralMatch[3]);
                const integral = numericIntegral(expression, start, end);
                return {
                    success: true,
                    message: `Integral from ${start} to ${end}: ${integral.toFixed(6)}`
                };
            }

            const expression = extractExpression(normalizedInput);
            if (!expression) {
                return { success: false, message: 'Provide an expression to evaluate.' };
            }

            if (expression.includes('=') || /\bx\b/i.test(expression)) {
                const [left, right = '0'] = expression.split('=');
                const roots = findRoots(`(${left}) - (${right})`);
                if (!roots.length) {
                    return { success: false, message: 'No real roots found for that equation.' };
                }

                return {
                    success: true,
                    message: `Approximate solution${roots.length > 1 ? 's' : ''}: ${roots.join(', ')}`
                };
            }

            const result = evaluateExpression(expression);
            return {
                success: true,
                message: `Result: ${Number(result.toFixed(10))}`
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
};

export default plugin;
