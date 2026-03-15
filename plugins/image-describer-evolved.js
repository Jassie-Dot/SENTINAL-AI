import fetch from 'node-fetch';

async function resolveImageDataUrl(userInput = '', context = {}) {
    if (typeof context.imageData === 'string' && context.imageData.startsWith('data:')) {
        return context.imageData;
    }

    if (typeof context.imageData === 'string' && context.imageData.trim()) {
        return `data:image/jpeg;base64,${context.imageData.trim()}`;
    }

    if (typeof context.image === 'string' && context.image.startsWith('data:')) {
        return context.image;
    }

    if (Buffer.isBuffer(context.image)) {
        return `data:image/jpeg;base64,${context.image.toString('base64')}`;
    }

    const urlMatch = userInput.match(/https?:\/\/[^\s]+/i);
    if (!urlMatch) {
        return null;
    }

    const response = await fetch(urlMatch[0]);
    if (!response.ok) {
        throw new Error(`Image download failed with status ${response.status}`);
    }

    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

const plugin = {
    name: 'image-describer',
    version: '1.1.0',
    description: 'Describes images by delegating vision-capable requests to the active AI handler.',

    async initialize() {
        console.log('[image-describer] Plugin online');
    },

    canHandle(intent, userInput) {
        return /\b(describe image|analyze image|image description|what is in this image)\b/i.test(userInput);
    },

    async handle(intent, userInput, context = {}) {
        if (!context.aiHandler?.generateResponse) {
            return { success: false, message: 'AI handler is unavailable for image analysis.' };
        }

        try {
            const imageUrl = await resolveImageDataUrl(userInput, context);
            if (!imageUrl) {
                return { success: false, message: 'Provide an image URL or attached image data.' };
            }

            const prompt = userInput.replace(/https?:\/\/[^\s]+/i, '').trim() || 'Describe this image in detail.';
            let reply = '';

            await context.aiHandler.generateResponse(
                [{
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: imageUrl } }
                    ]
                }],
                null,
                token => { reply += token; }
            );

            return {
                success: true,
                message: reply.trim() || 'No description was generated.'
            };
        } catch (error) {
            return { success: false, message: `Failed to analyze image: ${error.message}` };
        }
    }
};

export default plugin;
