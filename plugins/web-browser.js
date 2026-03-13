import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const plugin = {
    name: 'web-browser',
    version: '1.0.0',
    initialize() { 
        console.log('[PLUGIN] web-browser loaded'); 
    },
    canHandle(intent, text) { 
        return /web|browse|internet|site|search|URL|http/i.test(text); 
    },
    async handle(intent, userInput, context) {
        try {
            const searchQueryMatch = userInput.match(/search\s+(.+)/i);
            const urlMatch = userInput.match(/(https?:\/\/[^\s]+)/i);

            let result = '';

            if (urlMatch) {
                const url = urlMatch[1];
                result = await this.fetchAndSummarizeUrl(url);
            } else if (searchQueryMatch) {
                const query = searchQueryMatch[1];
                result = await this.performWebSearch(query);
            } else {
                return { 
                    success: false, 
                    message: "Please specify a URL starting with http/https or use 'search' followed by your query." 
                };
            }

            return { 
                success: true, 
                message: "Web browsing operation completed successfully.", 
                data: { result } 
            };

        } catch (error) {
            return { 
                success: false, 
                message: `Error during web browsing: ${error.message}` 
            };
        }
    },

    async fetchAndSummarizeUrl(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;

        const title = document.querySelector('title')?.textContent || 'No title found';
        const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        
        const textContent = document.body.textContent || '';
        const cleanedText = textContent.replace(/\s+/g, ' ').trim().substring(0, 500);

        let summary = `Title: ${title}\n`;
        if (metaDescription) {
            summary += `Description: ${metaDescription}\n`;
        }
        summary += `Content Preview: ${cleanedText}...`;

        return summary;
    },

    async performWebSearch(query) {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error(`Search failed with status: ${response.status}`);
        }

        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;

        const results = [];
        const resultElements = document.querySelectorAll('.result');

        resultElements.forEach((resultEl, index) => {
            if (index < 5) {
                const titleEl = resultEl.querySelector('.result__title');
                const snippetEl = resultEl.querySelector('.result__snippet');
                
                if (titleEl && snippetEl) {
                    const title = titleEl.textContent.trim();
                    const snippet = snippetEl.textContent.trim().substring(0, 200);
                    const link = titleEl.querySelector('a')?.href;

                    results.push({
                        title,
                        snippet: snippet + '...',
                        link
                    });
                }
            }
        });

        if (results.length === 0) {
            return "No search results found.";
        }

        let resultText = `Search results for "${query}":\n\n`;
        results.forEach((result, index) => {
            resultText += `${index + 1}. ${result.title}\n`;
            resultText += `   ${result.snippet}\n`;
            resultText += `   ${result.link}\n\n`;
        });

        return resultText;
    }
};

export default plugin;