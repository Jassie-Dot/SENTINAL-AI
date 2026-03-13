import fs from 'fsimport { createClient } from '@google-cloud/vision';
import sharp from 'sharp';

const plugin = {
    name: 'image-describer',
    version: '1.0.0',
    description: 'Describe and analyze images in detail. Requires process.env.GOOGLE_CLOUD_VISION_API_KEY to be set.',
    
    async initialize() {
        console.log('[image-describer] Plugin online');
    },
    
    canHandle(intent, userInput) {
        const keywords = ['describe image', 'analyze image', 'image description'];
        return keywords.some(k => userInput.toLowerCase().includes(k));
    },
    
    async handle(intent, userInput, context) {
        if (!process.env.GOOGLE_CLOUD_VISION_API_KEY) {
            return { success: false, message: 'GOOGLE_CLOUD_VISION_API_KEY is not set' };
        }

        const client = createClient({
            key: process.env.GOOGLE_CLOUD_VISION_API_KEY,
        });

        let image;
        if (context && context.image) {
            image = context.image;
        } else if (userInput.includes('http://') || userInput.includes('https://')) {
            const url = userInput.replace(/.*?(http[s]?:\/\/[^\s]+).*/, '$1');
            try {
                const response = await fetch(url);
                const buffer = await response.buffer();
                image = await sharp(buffer).toBuffer();
            } catch (error) {
                return { success: false, message: 'Failed to download image' };
            }
        } else {
            return { success: false, message: 'Please provide an image URL or upload an image' };
        }

        try {
            const [result] = await client.labelDetection(image);
            const labels = result.labelAnnotations;

            const description = labels.map(label => label.description).join(', ');
            return { success: true, message: `The image contains: ${description}` };
        } catch (error) {
            return { success: false, message: 'Failed to analyze image' };
        }
    }
};
export default plugin;