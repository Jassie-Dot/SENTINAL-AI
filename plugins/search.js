/**
 * Web Search Plugin for SENTINAL
 * Provides web search capabilities using DuckDuckGo
 */

import fetch from 'node-fetch';

const plugin = {
    name: 'Search',
    version: '1.0.0',
    description: 'Web search integration with result summarization',

    async initialize() {
        console.log('[SEARCH] Plugin initialized');
    },

    async cleanup() {
        console.log('[SEARCH] Plugin cleanup');
    },

    canHandle(intent, userInput) {
        return intent === 'search.web' ||
            /search|look up|find|google|what is|who is|tell me about/i.test(userInput);
    },

    async handle(intent, userInput, context) {
        try {
            // Extract search query
            let query = context.entities.query;

            if (!query) {
                const patterns = [
                    /search (?:for|about)\s+(.+)/i,
                    /look up\s+(.+)/i,
                    /what is\s+(.+)/i,
                    /who is\s+(.+)/i,
                    /tell me about\s+(.+)/i,
                    /find (?:information about|out about)\s+(.+)/i
                ];

                for (const pattern of patterns) {
                    const match = userInput.match(pattern);
                    if (match) {
                        query = match[1].trim();
                        break;
                    }
                }
            }

            if (!query) {
                return {
                    success: false,
                    message: "I need a search query, Sir. What would you like me to look up?"
                };
            }

            // Use DuckDuckGo Instant Answer API
            const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`);

            if (!response.ok) {
                throw new Error('Search API unavailable');
            }

            const data = await response.json();

            // Try to construct a useful response
            let message = '';

            if (data.AbstractText) {
                message = data.AbstractText;
                if (data.AbstractURL) {
                    message += `\n\nSource: ${data.AbstractURL}`;
                }
            } else if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                const topics = data.RelatedTopics.slice(0, 3);
                message = `Found information on "${query}":\n\n`;

                topics.forEach((topic, i) => {
                    if (topic.Text) {
                        message += `${i + 1}. ${topic.Text}\n`;
                        if (topic.FirstURL) {
                            message += `   ${topic.FirstURL}\n`;
                        }
                    }
                });
            } else {
                message = `I searched for "${query}" but didn't find a concise answer, Sir. You might want to check a proper search engine for more detailed results.`;
            }

            return {
                success: true,
                message: message.trim(),
                data: {
                    query: query,
                    abstract: data.AbstractText,
                    url: data.AbstractURL,
                    topics: data.RelatedTopics
                }
            };
        } catch (error) {
            console.error('[SEARCH] Error:', error.message);
            return {
                success: false,
                message: `Search failed, Sir. Network connectivity might be an issue.`
            };
        }
    }
};

export default plugin;
