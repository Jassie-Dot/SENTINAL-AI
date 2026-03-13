/**
 * Memory Plugin for SENTINAL (Cognitive Upgrade)
 * Provides structured long-term memory with semantic keyword retrieval.
 */

import fs from 'fs';
import path from 'path';

const plugin = {
    name: 'Memory System',
    version: '3.0.0', // Major upgrade
    description: 'Advanced cognitive memory with structured storage and semantic retrieval.',

    memoryFile: path.join(process.cwd(), 'data', 'memory.json'),
    data: {
        facts: [],       // General knowledge
        preferences: {}, // User specific settings
        system: {},      // OS/Hardware knowledge
        history: []      // Key conversation moments
    },

    async initialize() {
        console.log('[MEMORY] Initializing Cognitive Memory System...');
        this.loadMemory();

        // Migration logic
        if (Array.isArray(this.data.facts) && this.data.facts.length > 0 && typeof this.data.facts[0] === 'string') {
            console.log('[MEMORY] Migrating v1 string facts to v3 structured objects...');
            this.data.facts = this.data.facts.map(f => this.createEntry(f, 'general'));
            this.saveMemory();
        }
    },

    loadMemory() {
        if (fs.existsSync(this.memoryFile)) {
            try {
                const raw = fs.readFileSync(this.memoryFile, 'utf8');
                const loaded = JSON.parse(raw);
                this.data = { ...this.data, ...loaded };
            } catch (e) {
                console.error('[MEMORY] Corrupt memory file:', e);
            }
        }
    },

    saveMemory() {
        try {
            fs.writeFileSync(this.memoryFile, JSON.stringify(this.data, null, 2));
        } catch (e) {
            console.error('[MEMORY] Save failed:', e);
        }
    },

    /**
     * Advanced Keyword Extraction
     * Removes stop words and prioritizes nouns/verbs
     */
    extractKeywords(text) {
        if (!text) return [];
        const stopWords = ['this', 'that', 'with', 'from', 'have', 'what', 'when', 'where', 'your', 'about', 'want', 'make', 'just', 'like'];
        return text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3 && !stopWords.includes(w));
    },

    createEntry(text, category = 'general') {
        return {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            text: text,
            category: category,
            timestamp: new Date().toISOString(),
            keywords: this.extractKeywords(text),
            accessCount: 0
        };
    },

    /**
     * Store information intelligently
     */
    remember(text, category = 'general') {
        // Cleaning
        const cleanText = text
            .replace(/^(remember|note|save)\s+(that\s+)?/i, '')
            .replace(/^i\s+(like|want|hate|love)\s+/i, (match) => match.toLowerCase()) // Preserve "I like..."
            .trim();

        // Check for User Preferences (e.g. "I like blue")
        if (cleanText.match(/^i\s+(like|prefer|love|hate|want)\s+/i)) {
            // Extract core preference
            const match = cleanText.match(/^i\s+(?:like|prefer|love|hate|want)\s+(.+)/i);
            if (match) {
                const subject = this.extractKeywords(match[1]).join('_');
                this.data.preferences[subject] = cleanText;
                this.saveMemory();
                return { success: true, message: `Preference saved: ${cleanText}` };
            }
        }

        // Check Duplicates
        const exists = this.data.facts.find(f => f.text.toLowerCase() === cleanText.toLowerCase());
        if (exists) {
            exists.accessCount++; // Reinforce memory
            this.saveMemory();
            return { success: false, message: "I already have this in my long-term memory." };
        }

        const entry = this.createEntry(cleanText, category);
        this.data.facts.push(entry);
        this.saveMemory();
        return { success: true, message: `Memory stored: "${cleanText}"` };
    },

    /**
     * Semantic Recall
     */
    recall(query, limit = 5) {
        const queryKeywords = this.extractKeywords(query);
        if (queryKeywords.length === 0) return [];

        // 1. Check Preferences Direct Match
        const relevantPrefs = [];
        for (const [key, value] of Object.entries(this.data.preferences)) {
            if (queryKeywords.some(k => key.includes(k) || value.toLowerCase().includes(k))) {
                relevantPrefs.push(`PREFERENCE: ${value}`);
            }
        }

        // 2. Score Facts
        const scored = this.data.facts.map(fact => {
            let score = 0;
            // Keyword overlap
            queryKeywords.forEach(qkw => {
                if (fact.keywords.includes(qkw)) score += 3;
                else if (fact.text.toLowerCase().includes(qkw)) score += 1;
            });

            // Recency boost (optional)
            // const age = (Date.now() - new Date(fact.timestamp).getTime()) / (1000 * 60 * 60 * 24);
            // if (age < 1) score += 0.5;

            return { ...fact, score };
        });

        const relevantFacts = scored
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => `FACT: ${item.text}`);

        return [...relevantPrefs, ...relevantFacts];
    },

    canHandle(intent, userInput) {
        return intent === 'memory.remember' ||
            intent === 'memory.recall' ||
            /^(remember|recall|what did i|do you know)/i.test(userInput);
    },

    async handle(intent, userInput, context) {
        if (userInput.match(/^remember\s/i)) {
            const text = userInput.replace(/^remember\s/i, '');
            return this.remember(text);
        }

        if (userInput.match(/recall|what did i|do you know/i)) {
            const memories = this.recall(userInput);
            if (memories.length > 0) {
                return {
                    success: true,
                    message: `Here is what I found in my memory bank:\n${memories.join('\n')}`
                };
            }
            return { success: false, message: "No relevant long-term memories found." };
        }

        return { success: false, message: "Memory command not understood." };
    }
};

export default plugin;
