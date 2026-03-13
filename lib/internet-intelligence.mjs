/**
 * ====================================
 * SENTINAL INTERNET INTELLIGENCE
 * ====================================
 * Gives SENTINAL real-world awareness through web search,
 * news monitoring, and knowledge caching.
 * Uses DuckDuckGo (no API key needed) + RSS feeds.
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, '..', 'data', 'knowledge-cache.json');
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// RSS feeds for world awareness
const NEWS_FEEDS = [
    { name: 'Hacker News', url: 'https://hnrss.org/frontpage', type: 'rss' },
    { name: 'BBC Tech', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', type: 'rss' },
    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', type: 'rss' },
];

class InternetIntelligence {
    constructor() {
        this.cache = {};
        this.headlines = [];
        this.lastHeadlineFetch = 0;
        this._loadCache();
    }

    _loadCache() {
        try {
            const dataDir = path.join(__dirname, '..', 'data');
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
            if (fs.existsSync(CACHE_FILE)) {
                this.cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
                // Expire old entries
                const now = Date.now();
                for (const key of Object.keys(this.cache)) {
                    if (now - this.cache[key].timestamp > CACHE_TTL) {
                        delete this.cache[key];
                    }
                }
            }
        } catch (e) { this.cache = {}; }
    }

    _saveCache() {
        try {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2));
        } catch (e) { }
    }

    /**
     * Simple HTTP GET returning response body as string
     */
    _fetch(url, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            const lib = url.startsWith('https') ? https : http;
            const req = lib.get(url, { timeout: timeoutMs, headers: { 'User-Agent': 'SENTINAL/4.0' } }, (res) => {
                // Handle redirects
                if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
                    return this._fetch(res.headers.location, timeoutMs).then(resolve).catch(reject);
                }
                let data = '';
                res.on('data', chunk => { data += chunk.toString(); });
                res.on('end', () => resolve(data));
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
        });
    }

    /**
     * Read actual content from a website URL
     */
    async readWebsite(url) {
        try {
            const html = await this._fetch(url, 10000);
            const $ = cheerio.load(html);

            // Remove junk
            $('script, style, nav, footer, iframe, noscript, .ad, .sidebar').remove();

            // Extract meaningful text
            const text = $('body').text().replace(/\s+/g, ' ').trim();

            // Return max 5000 chars to avoid prompt overflow
            return text.substring(0, 5000);
        } catch (e) {
            console.error(`[INTERNET] Failed to read ${url}:`, e.message);
            return null;
        }
    }

    /**
     * DuckDuckGo Instant Answer API (no key needed) + Web Scraper Fallback
     */
    async search(query, useCache = true) {
        const cacheKey = `search:${query.toLowerCase()}`;

        if (useCache && this.cache[cacheKey]) {
            return this.cache[cacheKey].result;
        }

        try {
            const encoded = encodeURIComponent(query);
            const url = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;
            const raw = await this._fetch(url);
            const data = JSON.parse(raw);

            let result = data.AbstractText || data.Answer || '';
            if (!result && data.RelatedTopics && data.RelatedTopics.length > 0) {
                result = data.RelatedTopics[0].Text || '';

                // If it's just a short snippet, try to read the actual URL if provided
                if (data.RelatedTopics[0].FirstURL) {
                    console.log(`[INTERNET] Deep reading ${data.RelatedTopics[0].FirstURL}...`);
                    const deepContent = await this.readWebsite(data.RelatedTopics[0].FirstURL);
                    if (deepContent && deepContent.length > 200) {
                        result = `Summary: ${result}\nDeep Insight: ${deepContent}`;
                    }
                }
            }

            if (result) {
                this.cache[cacheKey] = { result, timestamp: Date.now() };
                this._saveCache();
            }

            return result || null;
        } catch (e) {
            console.error('[INTERNET] Search failed:', e.message);
            return null;
        }
    }

    /**
     * Get a current news headline for context injection into thoughts
     */
    async getLatestHeadline() {
        const now = Date.now();
        // Refresh headlines every 30 minutes
        if (now - this.lastHeadlineFetch > 30 * 60 * 1000) {
            await this._fetchHeadlines();
        }

        if (this.headlines.length > 0) {
            // Return a random recent headline
            return this.headlines[Math.floor(Math.random() * Math.min(10, this.headlines.length))];
        }

        return null;
    }

    async _fetchHeadlines() {
        const feed = NEWS_FEEDS[Math.floor(Math.random() * NEWS_FEEDS.length)];
        try {
            const xml = await this._fetch(feed.url, 8000);
            // Simple regex-based RSS title extraction
            const titles = [];
            const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/gi;
            let match;
            while ((match = titleRegex.exec(xml)) !== null && titles.length < 15) {
                const title = (match[1] || match[2] || '').trim();
                if (title && title !== feed.name && title.length > 10) {
                    titles.push(title);
                }
            }
            if (titles.length > 0) {
                this.headlines = titles;
                this.lastHeadlineFetch = Date.now();
                console.log(`[INTERNET] Loaded ${titles.length} headlines from ${feed.name}`);
            }
        } catch (e) {
            console.error(`[INTERNET] Failed to fetch headlines from ${feed.name}:`, e.message);
        }
    }

    /**
     * Learn about a topic — search and cache the result
     */
    async learn(topic) {
        const result = await this.search(topic, false);
        if (result) {
            console.log(`[INTERNET] Learned about: ${topic}`);
        }
        return result;
    }

    /**
     * Get all cached knowledge
     */
    getKnowledgeBase() {
        return Object.entries(this.cache).map(([key, val]) => ({
            query: key.replace('search:', ''),
            result: val.result,
            cached: new Date(val.timestamp).toISOString()
        }));
    }
}

export default InternetIntelligence;
