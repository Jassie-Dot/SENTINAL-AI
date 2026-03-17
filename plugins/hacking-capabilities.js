const plugin = {
    name: 'crypto-utils',
    version: '1.0.0',
    
    initialize() { 
        console.log('[PLUGIN] crypto-utils loaded'); 
    },
    
    canHandle(intent, text) { 
        return /(base64|encode|decode|encrypt|decrypt)\b/i.test(text); 
    },
    
    async handle(intent, text, context) {
        try {
            const trimmedText = text.trim().toLowerCase();
            
            if (trimmedText.includes('encode') || trimmedText.includes('encrypt') || trimmedText.includes('base64')) {
                const textToEncode = context?.text || text.replace(/.*?(encode|encrypt|base64)/i, '').trim() || 'default text';
                const encoded = Buffer.from(textToEncode).toString('base64');
                return { 
                    success: true, 
                    message: "Base64 encoded successfully.", 
                    data: { original: textToEncode, base64: encoded }
                };
            }
            
            else if (trimmedText.includes('decode') || trimmedText.includes('decrypt')) {
                const textToDecode = context?.text || text.replace(/.*?(decode|decrypt)/i, '').trim() || '';
                try {
                    const decoded = Buffer.from(textToDecode, 'base64').toString('utf8');
                    return { 
                        success: true, 
                        message: "Base64 decoded successfully.", 
                        data: { base64: textToDecode, decoded }
                    };
                } catch (error) {
                    return { 
                        success: false, 
                        message: "Failed to decode: invalid base64." 
                    };
                }
            }
            
            else {
                return {
                    success: true,
                    message: "Crypto utilities ready.",
                    data: {
                        available_operations: ["base64 encode", "base64 decode"],
                       note: "This module provides safe encoding/decoding utilities only."
                    }
                };
            }
            
        } catch (error) {
            return {
                success: false,
                message: `Crypto operation failed: ${error.message}`,
                data: { error: error.toString() }
            };
        }
    }
};

export default plugin;