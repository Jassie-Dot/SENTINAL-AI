/**
 * ====================================
 * SENTINAL LONG-TERM MEMORY
 * ====================================
 * Analyzes conversations to extract facts and preferences.
 * Persists them to provide continuous context across sessions.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEMORY_FILE = path.join(__dirname, '..', 'data', 'long-term-memory.json');

export class LongTermMemory {
    constructor(aiHandler) {
        this.aiHandler = aiHandler;
        this.facts = []; // Array of { fact: string, timestamp: string, confidence: number }
        this.isExtracting = false;

        this._loadMemory();
    }

    _loadMemory() {
        try {
            const dataDir = path.join(__dirname, '..', 'data');
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

            if (fs.existsSync(MEMORY_FILE)) {
                this.facts = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
            }
        } catch (e) {
            console.error('[MEMORY] Failed to load long-term memory:', e.message);
            this.facts = [];
        }
    }

    _saveMemory() {
        try {
            // Keep top 500 facts
            if (this.facts.length > 500) {
                this.facts = this.facts.slice(-500);
            }
            fs.writeFileSync(MEMORY_FILE, JSON.stringify(this.facts, null, 2));
        } catch (e) {
            console.error('[MEMORY] Failed to save long-term memory:', e.message);
        }
    }

    /**
     * Parse new user input to see if there are permanent facts to remember
     * Runs asynchronously so it doesn't block the chat response
     */
    async extractFacts(userInput, aiResponse = "") {
        if (!this.aiHandler || this.isExtracting || this.aiHandler.currentProvider === 'offline') return;

        // Fast heuristic to skip extraction if no keywords are present 
        // (to save AI tokens)
        const keywords = ['my', 'i am', 'i like', 'i hate', 'prefer', 'name is', 'live in', 'work', 'remember', 'always'];
        if (!keywords.some(k => userInput.toLowerCase().includes(k))) return;

        this.isExtracting = true;
        try {
            const prompt = `Analyze this message from the user: "${userInput}"
If the system response was: "${aiResponse}"

Does the user mention any permanent facts, personal preferences, relationships, or details worth remembering for the future? 
If YES, extract them into a JSON array of concise factual statements. Example: ["The user's dog is named Buster", "The user prefers dark mode", "The user is a software engineer"].
If NO, output an empty array: []

OUTPUT ONLY VALID JSON. No markdown ticks, no extra text.`;

            let resultJson = "";
            const result = await this.aiHandler.generateResponse(
                [{ role: 'user', content: prompt }],
                null,
                (token) => { resultJson += token; },
                null,
                false // Low priority
            );

            if (result !== null && resultJson) {
                const cleanJson = resultJson.replace(/```json|```/gi, '').trim();
                const newFacts = JSON.parse(cleanJson);

                if (Array.isArray(newFacts) && newFacts.length > 0) {
                    let added = 0;
                    for (const f of newFacts) {
                        // Avoid duplicates
                        if (!this.facts.some(existing => existing.fact.toLowerCase() === f.toLowerCase())) {
                            this.facts.push({
                                fact: f,
                                timestamp: new Date().toISOString(),
                                confidence: 0.9 // High confidence if AI extracted it directly
                            });
                            added++;
                        }
                    }
                    if (added > 0) {
                        console.log(`[MEMORY] Learned ${added} new fact(s) about the user.`);
                        this._saveMemory();
                    }
                }
            }
        } catch (e) {
            // Silently fail extraction on JSON parse errors or network issues
        } finally {
            this.isExtracting = false;
        }
    }

    /**
     * Retrieve relevant facts based on the current context/user input
     */
    async getRelevantContext(currentInput) {
        if (this.facts.length === 0) return "No long term memories established yet.";

        // In a highly advanced system, we would use vector embeddings to do cosine similarity search.
        // For local lightweight performance, we'll do keyword matching.

        const words = currentInput.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 3);

        if (words.length === 0) {
            // Return 15 most recent if no keywords
            return this.facts.slice(-15).map(f => `- ${f.fact}`).join('\n');
        }

        const scoredFacts = this.facts.map(f => {
            const factLower = f.fact.toLowerCase();
            let score = 0;
            for (const w of words) {
                if (factLower.includes(w)) score++;
            }
            return { ...f, score };
        }).filter(f => f.score > 0);

        scoredFacts.sort((a, b) => b.score - a.score); // Highest score first

        const topFacts = scoredFacts.slice(0, 15); // Limit to top 15 highly relevant facts

        if (topFacts.length === 0) return "No highly relevant memories found for this specific query, but standard memory banks are active.";

        return "Relevant facts about the user:\n" + topFacts.map(f => `- ${f.fact}`).join('\n');
    }

    getAllFacts() {
        return [...this.facts];
    }
}

export default LongTermMemory;
