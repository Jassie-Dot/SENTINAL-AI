import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const plugin = {
    name: 'video-maker',
    version: '1.0.0',
    
    initialize() { 
        console.log('[PLUGIN] video-maker loaded'); 
    },
    
    canHandle(intent, text) { 
        return /video|create|generate|mp4|mkv|avi/i.test(text); 
    },
    
    async handle(intent, userInput, context) {
        try {
            const { sourceUrl, outputFormat = 'mp4' } = context;
            
            if (!sourceUrl) {
                return { 
                    success: false, 
                    message: "No video source provided. Please provide a sourceUrl in context." 
                };
            }
            
            console.log(`[video-maker] Processing video from: ${sourceUrl}`);
            
            const videoContent = await this.downloadVideo(sourceUrl);
            const outputPath = await this.processVideo(videoContent, outputFormat);
            
            return {
                success: true,
                message: `Video successfully created in ${outputFormat} format`,
                data: {
                    outputPath,
                    format: outputFormat,
                    source: sourceUrl,
                    size: fs.statSync(outputPath).size
                }
            };
            
        } catch (error) {
            return {
                success: false,
                message: `Video creation failed: ${error.message}`,
                error: error.toString()
            };
        }
    },
    
    async downloadVideo(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.statusText}`);
        }
        return await response.buffer();
    },
    
    async processVideo(videoBuffer, format) {
        const outputDir = './output';
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const timestamp = Date.now();
        const outputPath = path.join(outputDir, `video-${timestamp}.${format}`);
        
        fs.writeFileSync(outputPath, videoBuffer);
        
        return outputPath;
    }
};

export default plugin;