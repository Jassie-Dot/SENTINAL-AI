import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

function parseSearchQuery(userInput = '') {
    const searchQueryMatch = userInput.match(/search\s+(.+)/i);
    return searchQueryMatch ? searchQueryMatch[1].trim() : '';
}

function parseUrl(userInput = '') {
    const urlMatch = userInput.match(/(https?:\/\/[^\s]+)/i);
    return urlMatch ? urlMatch[1] : '';
}

const plugin = {
    name: 'web-browser',
    version: '1.1.0',

    async initialize() {
        console.log('[PLUGIN] web-browser loaded');
    },

    canHandle(intent, text) {
        return /\b(web|browse|internet|site|search|url|http)\b/i.test(text);
    },

    async handle(intent, userInput) {
        try {
            const url = parseUrl(userInput);
            const query = parseSearchQuery(userInput);

            let result = '';
            if (url) {
                result = await this.fetchAndSummarizeUrl(url);
            } else if (query) {
                result = await this.performWebSearch(query);
            } else {
                return {
                    success: false,
                    message: "Specify a URL or use 'search <query>'."
                };
            }

            return {
                success: true,
                message: 'Web browsing operation completed successfully.',
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
            throw new Error(`HTTP error ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const title = $('title').first().text().trim() || 'No title found';
        const metaDescription = $('meta[name="description"]').attr('content') || '';
        const textContent = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 500);

        let summary = `Title: ${title}\n`;
        if (metaDescription) {
            summary += `Description: ${metaDescription}\n`;
        }
        summary += `Content Preview: ${textContent}...`;
        return summary;
    },

    async performWebSearch(query) {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error(`Search failed with status ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const results = [];

        $('.result').slice(0, 5).each((index, element) => {
            const title = $(element).find('.result__title').text().trim();
            const snippet = $(element).find('.result__snippet').text().trim();
            const link = $(element).find('.result__title a').attr('href');

            if (title && snippet) {
                results.push({
                    title,
                    snippet: `${snippet.slice(0, 200)}...`,
                    link: link || 'link unavailable'
                });
            }
        });

        if (!results.length) {
            return `No search results found for "${query}".`;
        }

        return results
            .map((result, index) => `${index + 1}. ${result.title}\n${result.snippet}\n${result.link}`)
            .join('\n\n');
    }
};

export default plugin;
