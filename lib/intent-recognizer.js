/**
 * Intent Recognizer
 * NLP-based intent classification and command parsing
 */

import natural from 'natural';
import fs from 'fs';
import path from 'path';


export class IntentRecognizer {
    constructor() {
        this.classifier = new natural.BayesClassifier();
        this.intents = new Map();
        this.trained = false;
        this.cacheFile = path.join(process.cwd(), 'lib', 'nlp-cache.json');

        // Initialize with default intents
        this.initializeDefaultIntents();
    }

    /**
     * Initialize default intent patterns
     */
    initializeDefaultIntents() {
        // System control intents
        this.addIntent('system.open', [
            'open chrome',
            'launch browser',
            'start vscode',
            'run notepad',
            'open calculator',
            'launch steam',
            'start discord'
        ]);

        this.addIntent('system.close', [
            'close chrome',
            'exit browser',
            'quit application',
            'stop the app'
        ]);

        // Weather intents
        this.addIntent('weather.get', [
            'what is the weather',
            'weather forecast',
            'how is the weather',
            'will it rain today',
            'temperature outside',
            'whats the weather like'
        ]);

        // Calendar/Reminder intents
        this.addIntent('calendar.create', [
            'remind me to',
            'set a reminder',
            'create a reminder',
            'schedule a meeting',
            'add to calendar',
            'dont let me forget'
        ]);

        this.addIntent('calendar.list', [
            'show my reminders',
            'list reminders',
            'what are my tasks',
            'upcoming events',
            'whats on my calendar'
        ]);

        // Note-taking intents
        this.addIntent('notes.create', [
            'take a note',
            'create a note',
            'save this',
            'write down',
            'make a note'
        ]);

        this.addIntent('notes.list', [
            'show my notes',
            'list notes',
            'what notes do I have',
            'read my notes'
        ]);

        // Search intents
        this.addIntent('search.web', [
            'search for',
            'look up',
            'find information about',
            'google',
            'search the web'
        ]);

        // Time and Date intents
        this.addIntent('system.time', [
            'what time is it',
            'current time',
            'tell me the time',
            'what is the time',
            'clock'
        ]);

        this.addIntent('system.date', [
            'what day is it',
            'what is the date',
            'current date',
            'today is',
            'tell me the date'
        ]);

        // System monitoring
        this.addIntent('system.status', [
            'system status',
            'how is the system',
            'cpu usage',
            'memory usage',
            'system resources',
            'performance metrics'
        ]);

        // File operations
        this.addIntent('file.find', [
            'find file',
            'locate document',
            'search for file',
            'where is my file'
        ]);

        // Location intents
        this.addIntent('location.get', [
            'where am i',
            'my location',
            'current location',
            'find me',
            'show my location',
            'geolocation'
        ]);

        // Process management intents
        this.addIntent('process.list', [
            'show running processes',
            'list processes',
            'running applications',
            'task manager',
            'what processes are running'
        ]);

        this.addIntent('process.kill', [
            'kill process',
            'stop process',
            'terminate application',
            'close program'
        ]);

        // Clipboard intents
        this.addIntent('clipboard.read', [
            'whats in my clipboard',
            'show clipboard',
            'read clipboard',
            'clipboard content',
            'what did i copy'
        ]);

        this.addIntent('clipboard.write', [
            'copy to clipboard',
            'write to clipboard',
            'set clipboard'
        ]);

        // Screenshot intents
        this.addIntent('screenshot.take', [
            'take screenshot',
            'capture screen',
            'screenshot',
            'snap screen',
            'screen capture'
        ]);

        // Camera intents
        this.addIntent('camera.capture', [
            'take picture',
            'take a picture',
            'take photo',
            'take a photo',
            'snap a photo',
            'click a picture',
            'open camera',
            'take selfie'
        ]);

        // Notification intents
        this.addIntent('notification.send', [
            'send notification',
            'notify me',
            'show notification',
            'alert me',
            'create notification'
        ]);

        // Conversation
        this.addIntent('conversation.greeting', [
            'hello',
            'hi sentinal',
            'hey',
            'good morning',
            'good evening',
            'whats up'
        ]);

        this.addIntent('conversation.farewell', [
            'goodbye',
            'bye',
            'see you',
            'good night',
            'talk to you later'
        ]);

        this.addIntent('conversation.thanks', [
            'thank you',
            'thanks',
            'appreciate it',
            'thanks sentinal'
        ]);

        // Self-Evolution Intents
        this.addIntent('system.integrate', [
            'integrate',
            'add feature',
            'install module',
            'enable capability',
            'setup plugin'
        ]);

        this.addIntent('system.upgrade', [
            'upgrade yourself',
            'update system',
            'self upgrade',
            'evolve',
            'improve yourself'
        ]);

        // Security/Hacking Intents
        this.addIntent('security.activate', [
            'hack',
            'hacking mode',
            'activate matrix mode',
            'system breach',
            'run security scan',
            'network scan',
            'cyber security',
            'matrix effect',
            'open terminal',
            'show hacker news',
            'trace ip',
            'whois lookup',
            'nmap scan',
            'haack' // Handling common typo
        ]);

        // Entertainment/Fun Intents
        this.addIntent('entertainment.play', [
            'lets play game',
            'play a game',
            'start game',
            'i want to play',
            'tell me a joke',
            'entertain me',
            'lets have fun'
        ]);

        // Train the classifier
        this.train();
    }

    /**
     * Add an intent with training examples
     */
    addIntent(intentName, examples) {
        if (!this.intents.has(intentName)) {
            this.intents.set(intentName, []);
        }

        const intentExamples = this.intents.get(intentName);
        intentExamples.push(...examples);

        // Add to classifier
        examples.forEach(example => {
            this.classifier.addDocument(example.toLowerCase(), intentName);
        });

        this.trained = false;
    }

    /**
     * Train the classifier
     */
    train() {
        if (!this.trained) {
            // Try loading from cache first
            if (this.loadClassifier()) {
                console.log('[INTENT] Loaded classifier from cache.');
                this.trained = true;
                return;
            }

            console.log('[INTENT] Training new classifier...');
            this.classifier.train();
            this.trained = true;
            this.saveClassifier();
            console.log('[INTENT] Classifier trained with intents:', Array.from(this.intents.keys()));
        }
    }

    saveClassifier() {
        try {
            this.classifier.save(this.cacheFile, (err) => {
                if (err) console.error('[INTENT] Failed to save cache:', err);
            });
        } catch (e) {
            console.error('[INTENT] Error saving cache:', e);
        }
    }

    loadClassifier() {
        if (fs.existsSync(this.cacheFile)) {
            try {
                // Natural's save/load is async usually, but we need sync for startup or careful handling.
                // Actually natural.BayesClassifier.load is the static method.
                // But since we already instantiated, we might need to swap.
                // Let's rely on standard re-training for now if sync loading is complex, 
                // but actually natural has a synchronous restore? No, only async usually.
                // Let's keep it simple: We re-train for now, but to optimize, we should use save/load.
                // Note: natural.BayesClassifier.load(filename, stemmer, callback)

                // For this iteration, let's just use the in-memory training which is fast enough for <50 intents.
                // I will add the method stubs but maybe skip complex implementation to avoid async startup race conditions for now.
                return false;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    /**
     * Classify user input and return intent with confidence
     */
    classify(userInput) {
        if (!this.trained) {
            this.train();
        }

        const classifications = this.classifier.getClassifications(userInput.toLowerCase());

        // Get top classification
        const topClassification = classifications[0];

        return {
            intent: topClassification.label,
            confidence: topClassification.value,
            alternatives: classifications.slice(1, 3).map(c => ({
                intent: c.label,
                confidence: c.value
            }))
        };
    }

    /**
     * Extract entities from user input based on intent
     */
    extractEntities(userInput, intent) {
        const entities = {};

        // Application name extraction for system.open
        if (intent === 'system.open') {
            const appPatterns = [
                /open\s+(\w+)/i,
                /launch\s+(\w+)/i,
                /start\s+(\w+)/i,
                /run\s+(\w+)/i
            ];

            for (const pattern of appPatterns) {
                const match = userInput.match(pattern);
                if (match) {
                    entities.application = match[1].toLowerCase();
                    break;
                }
            }
        }

        // Reminder text extraction for calendar.create
        if (intent === 'calendar.create') {
            const reminderPattern = /remind me to (.+)/i;
            const match = userInput.match(reminderPattern);
            if (match) {
                entities.reminderText = match[1];
            }

            // Time extraction
            const timePattern = /at (\d{1,2}:\d{2}|in \d+ (?:minute|hour|day)s?)/i;
            const timeMatch = userInput.match(timePattern);
            if (timeMatch) {
                entities.time = timeMatch[1];
            }
        }

        // Note content extraction
        if (intent === 'notes.create') {
            const notePatterns = [
                /note:\s*(.+)/i,
                /take a note\s+(.+)/i,
                /write down\s+(.+)/i,
                /save this:\s*(.+)/i
            ];

            for (const pattern of notePatterns) {
                const match = userInput.match(pattern);
                if (match) {
                    entities.noteContent = match[1];
                    break;
                }
            }
        }

        // Search query extraction
        if (intent === 'search.web') {
            const searchPatterns = [
                /search (?:for|about)\s+(.+)/i,
                /look up\s+(.+)/i,
                /what is\s+(.+)/i,
                /who is\s+(.+)/i,
                /find (?:information about)\s+(.+)/i
            ];

            for (const pattern of searchPatterns) {
                const match = userInput.match(pattern);
                if (match) {
                    entities.query = match[1];
                    break;
                }
            }
        }

        // Integration target extraction
        if (intent === 'system.integrate') {
            const match = userInput.match(/(?:integrate|add|install|setup)\s+(?:the\s+)?(.+)/i);
            if (match) {
                entities.feature = match[1].trim();
            }
        }

        return entities;
    }

    /**
     * Parse user input and return complete intent analysis
     */
    parse(userInput) {
        const classification = this.classify(userInput);
        const entities = this.extractEntities(userInput, classification.intent);

        return {
            input: userInput,
            intent: classification.intent,
            confidence: classification.confidence,
            entities: entities,
            alternatives: classification.alternatives,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get all registered intents
     */
    getIntents() {
        return Array.from(this.intents.keys());
    }

    /**
     * Get examples for a specific intent
     */
    getIntentExamples(intentName) {
        return this.intents.get(intentName) || [];
    }
}

export default IntentRecognizer;
