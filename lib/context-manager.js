/**
 * Context Manager
 * Advanced conversation context tracking and management
 */

import EventEmitter from 'events';

export class ContextManager extends EventEmitter {
    constructor(maxContextLength = 10) {
        super();
        this.maxContextLength = maxContextLength;
        this.sessions = new Map();
        this.aiHandler = null;
    }

    setAIHandler(aiHandler) {
        this.aiHandler = aiHandler;
    }

    /**
     * Get or create a session
     */
    getSession(sessionId = 'default') {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                id: sessionId,
                messages: [],
                summary: "",
                entities: new Map(),
                topics: [],
                metadata: {},
                createdAt: new Date(),
                lastActivity: new Date()
            });
        }
        return this.sessions.get(sessionId);
    }

    /**
     * Add a message to the context
     */
    addMessage(sessionId, role, content, metadata = {}) {
        const session = this.getSession(sessionId);

        const message = {
            role,
            content,
            timestamp: new Date(),
            metadata
        };

        session.messages.push(message);
        session.lastActivity = new Date();

        // Prune old messages iteratively in chunks of 5 to batch summarization
        if (session.messages.length > this.maxContextLength) {
            const overflow = session.messages.length - this.maxContextLength + 5;
            if (session.messages.length > overflow) {
                const removed = session.messages.splice(0, overflow);
                this.emit('context:pruned', sessionId, removed);
                this._summarizePruned(sessionId, removed);
            }
        }

        // Extract entities and topics
        this.extractEntities(sessionId, content);

        this.emit('context:updated', sessionId, message);

        return message;
    }

    /**
     * Get conversation history for a session
     */
    getHistory(sessionId, limit = null) {
        const session = this.getSession(sessionId);

        if (limit) {
            return session.messages.slice(-limit);
        }

        return session.messages;
    }

    /**
     * Alias for getHistory (Legacy Support)
     */
    getMessages(sessionId, limit = null) {
        return this.getHistory(sessionId, limit);
    }

    /**
     * Get formatted history for AI models
     */
    getFormattedHistory(sessionId, limit = null) {
        const session = this.getSession(sessionId);
        const messages = this.getHistory(sessionId, limit);

        const formatted = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
        }));

        if (session.summary && (!limit || limit >= messages.length)) {
            formatted.unshift({
                role: 'system',
                content: `[Previous Conversation Summary]\n${session.summary}`
            });
        }

        return formatted;
    }

    /**
     * Background summarization of old context
     */
    async _summarizePruned(sessionId, removedMessages) {
        const session = this.getSession(sessionId);
        if (!this.aiHandler || this.aiHandler.currentProvider === 'offline' || removedMessages.length === 0) return;

        try {
            const transcript = removedMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
            const prompt = `Summarize the following conversation segment concisely. Retain essential context, user goals, and constraints.
If there is an existing summary, integrate this new information to form one cohesive updated summary.

EXISTING SUMMARY:
${session.summary || "None"}

NEW CONVERSATION TO INTEGRATE:
${transcript}

OUTPUT ONLY the text of the new summary. No markdown or conversational filler.`;

            let newSummary = "";
            const result = await this.aiHandler.generateResponse(
                [{ role: 'user', content: prompt }],
                null,
                (token) => { newSummary += token; },
                null,
                false // Low priority
            );

            if (result !== null && newSummary.trim()) {
                session.summary = newSummary.trim();
                console.log(`[CONTEXT] Session ${sessionId} summary updated (infinite context maintained).`);
            }
        } catch (e) {
            console.error('[CONTEXT] Background summarization failed:', e.message);
        }
    }

    /**
     * Extract entities from text (simple implementation)
     */
    extractEntities(sessionId, text) {
        const session = this.getSession(sessionId);

        // Simple entity extraction patterns
        const patterns = {
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            url: /https?:\/\/[^\s]+/g,
            phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
            time: /\b\d{1,2}:\d{2}\s?(AM|PM|am|pm)?\b/g,
            date: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    if (!session.entities.has(type)) {
                        session.entities.set(type, []);
                    }
                    const entities = session.entities.get(type);
                    if (!entities.includes(match)) {
                        entities.push(match);
                    }
                });
            }
        }
    }

    /**
     * Get entities for a session
     */
    getEntities(sessionId, type = null) {
        const session = this.getSession(sessionId);

        if (type) {
            return session.entities.get(type) || [];
        }

        return Object.fromEntries(session.entities);
    }

    /**
     * Set session metadata
     */
    setMetadata(sessionId, key, value) {
        const session = this.getSession(sessionId);
        session.metadata[key] = value;
        this.emit('context:metadata', sessionId, key, value);
    }

    /**
     * Get session metadata
     */
    getMetadata(sessionId, key = null) {
        const session = this.getSession(sessionId);

        if (key) {
            return session.metadata[key];
        }

        return session.metadata;
    }

    /**
     * Add a topic to the session
     */
    addTopic(sessionId, topic) {
        const session = this.getSession(sessionId);

        if (!session.topics.includes(topic)) {
            session.topics.push(topic);
            this.emit('context:topic', sessionId, topic);
        }
    }

    /**
     * Get topics for a session
     */
    getTopics(sessionId) {
        const session = this.getSession(sessionId);
        return session.topics;
    }

    /**
     * Clear session context
     */
    clearSession(sessionId) {
        if (this.sessions.has(sessionId)) {
            this.sessions.delete(sessionId);
            this.emit('context:cleared', sessionId);
            return true;
        }
        return false;
    }

    /**
     * Get all active sessions
     */
    getAllSessions() {
        return Array.from(this.sessions.keys());
    }

    /**
     * Get session summary
     */
    getSummary(sessionId) {
        const session = this.getSession(sessionId);

        return {
            id: session.id,
            messageCount: session.messages.length,
            entityCount: Array.from(session.entities.values()).flat().length,
            topics: session.topics,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            duration: Date.now() - session.createdAt.getTime()
        };
    }

    /**
     * Create context injection for AI (includes relevant entities and topics)
     */
    createContextInjection(sessionId) {
        const session = this.getSession(sessionId);
        const entities = this.getEntities(sessionId);
        const topics = this.getTopics(sessionId);

        let injection = '';

        if (topics.length > 0) {
            injection += `\nCurrent topics: ${topics.join(', ')}`;
        }

        const entityTypes = Object.keys(entities);
        if (entityTypes.length > 0) {
            injection += '\n\nExtracted information:';
            for (const [type, values] of Object.entries(entities)) {
                if (values.length > 0) {
                    injection += `\n- ${type}: ${values.join(', ')}`;
                }
            }
        }

        return injection;
    }
    /**
     * Get session state (Legacy compatibility + CWD tracking)
     */
    getSessionState(sessionId) {
        const session = this.getSession(sessionId);

        // Ensure state exists
        if (!session.state) {
            session.state = {
                cwd: process.cwd(),
                startTime: Date.now()
            };
        }
        return session.state;
    }

    /**
     * Update session CWD
     */
    updateSessionCwd(sessionId, newPath) {
        const state = this.getSessionState(sessionId);
        state.cwd = newPath;
        this.emit('context:cwd_updated', sessionId, newPath);
    }
}

export default ContextManager;
