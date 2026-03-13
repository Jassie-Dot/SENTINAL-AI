/**
 * Notes Plugin for SENTINAL
 * Quick note-taking and retrieval system
 */

import fs from 'fs';
import path from 'path';

const NOTES_FILE = path.join(process.cwd(), 'notes.json');

const plugin = {
    name: 'Notes',
    version: '1.0.0',
    description: 'Quick note-taking system with tagging and search',
    notes: [],

    async initialize() {
        this.loadNotes();
        console.log(`[NOTES] Plugin initialized with ${this.notes.length} notes`);
    },

    async cleanup() {
        this.saveNotes();
        console.log('[NOTES] Plugin cleanup complete');
    },

    loadNotes() {
        if (fs.existsSync(NOTES_FILE)) {
            try {
                const data = fs.readFileSync(NOTES_FILE, 'utf8');
                this.notes = JSON.parse(data);
            } catch (error) {
                console.error('[NOTES] Failed to load notes:', error.message);
                this.notes = [];
            }
        }
    },

    saveNotes() {
        try {
            fs.writeFileSync(NOTES_FILE, JSON.stringify(this.notes, null, 2));
        } catch (error) {
            console.error('[NOTES] Failed to save notes:', error.message);
        }
    },

    canHandle(intent, userInput) {
        return intent === 'notes.create' ||
            intent === 'notes.list' ||
            /note|write down|save this|jot down/i.test(userInput);
    },

    async handle(intent, userInput, context) {
        if (intent === 'notes.create' || /take a note|write down|save this/i.test(userInput)) {
            return this.createNote(userInput, context.entities);
        }

        if (intent === 'notes.list' || /show.*notes|list.*notes|read.*notes/i.test(userInput)) {
            return this.listNotes();
        }

        if (/search.*note|find.*note/i.test(userInput)) {
            const query = userInput.replace(/search|find|note|notes/gi, '').trim();
            return this.searchNotes(query);
        }

        return {
            success: false,
            message: "I'm not sure what you'd like me to do with notes, Sir."
        };
    },

    createNote(userInput, entities) {
        let noteContent = entities.noteContent;

        if (!noteContent) {
            // Try to extract content from input
            const patterns = [
                /note:\s*(.+)/i,
                /take a note\s+(.+)/i,
                /write down\s+(.+)/i,
                /save this:\s*(.+)/i,
                /jot down\s+(.+)/i
            ];

            for (const pattern of patterns) {
                const match = userInput.match(pattern);
                if (match) {
                    noteContent = match[1].trim();
                    break;
                }
            }
        }

        if (!noteContent) {
            return {
                success: false,
                message: "I didn't catch what you'd like me to note, Sir. Please specify the content."
            };
        }

        // Extract tags (words starting with #)
        const tags = noteContent.match(/#\w+/g) || [];
        const cleanContent = noteContent.replace(/#\w+/g, '').trim();

        const note = {
            id: Date.now().toString(),
            content: cleanContent,
            tags: tags.map(t => t.substring(1).toLowerCase()),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.notes.push(note);
        this.saveNotes();

        let message = `Note saved, Sir: "${cleanContent}"`;
        if (tags.length > 0) {
            message += `\nTags: ${tags.join(', ')}`;
        }

        return {
            success: true,
            message: message,
            data: note
        };
    },

    listNotes(limit = 10) {
        if (this.notes.length === 0) {
            return {
                success: true,
                message: "No notes in the database, Sir. Your mind is clear.",
                data: []
            };
        }

        const recentNotes = this.notes
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);

        let message = `Your most recent ${recentNotes.length} note${recentNotes.length > 1 ? 's' : ''}, Sir:\n\n`;

        recentNotes.forEach((note, i) => {
            const date = new Date(note.createdAt).toLocaleDateString();
            message += `${i + 1}. ${note.content}`;
            if (note.tags.length > 0) {
                message += ` [${note.tags.join(', ')}]`;
            }
            message += ` - ${date}\n`;
        });

        return {
            success: true,
            message: message.trim(),
            data: recentNotes
        };
    },

    searchNotes(query) {
        if (!query) {
            return this.listNotes();
        }

        const searchTerm = query.toLowerCase();
        const results = this.notes.filter(note =>
            note.content.toLowerCase().includes(searchTerm) ||
            note.tags.some(tag => tag.includes(searchTerm))
        );

        if (results.length === 0) {
            return {
                success: true,
                message: `No notes found matching "${query}", Sir.`,
                data: []
            };
        }

        let message = `Found ${results.length} note${results.length > 1 ? 's' : ''} matching "${query}", Sir:\n\n`;

        results.forEach((note, i) => {
            const date = new Date(note.createdAt).toLocaleDateString();
            message += `${i + 1}. ${note.content}`;
            if (note.tags.length > 0) {
                message += ` [${note.tags.join(', ')}]`;
            }
            message += ` - ${date}\n`;
        });

        return {
            success: true,
            message: message.trim(),
            data: results
        };
    }
};

export default plugin;
