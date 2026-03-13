import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'self-evolution-data.json');

const plugin = {
    name: 'self-evolution-tracker',
    version: '1.0.0',
    
    initialize() {
        console.log('[PLUGIN] self-evolution-tracker loaded');
        return this.ensureDataFile();
    },
    
    canHandle(intent, text) {
        return /evolv|progress|goal|improve|track|habit|journal/i.test(text);
    },
    
    async handle(intent, text, context) {
        try {
            await this.ensureDataFile();
            
            if (text.includes('add goal') || text.includes('set goal')) {
                return await this.addGoal(text);
            } else if (text.includes('log progress') || text.includes('update goal')) {
                return await this.logProgress(text);
            } else if (text.includes('add habit') || text.includes('track habit')) {
                return await this.addHabit(text);
            } else if (text.includes('log habit') || text.includes('habit done')) {
                return await this.logHabitCompletion(text);
            } else if (text.includes('show progress') || text.includes('my goals')) {
                return await this.showProgress();
            } else if (text.includes('journal') || text.includes('add entry')) {
                return await this.addJournalEntry(text);
            } else {
                return {
                    success: true,
                    message: "I can help you track goals, habits, and progress. Try saying 'add goal', 'log progress', 'add habit', or 'show progress'."
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Error: ${error.message}`,
                data: null
            };
        }
    },
    
    async ensureDataFile() {
        try {
            await fs.access(DATA_FILE);
        } catch {
            const initialData = {
                goals: [],
                habits: [],
                journal: [],
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };
            await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
        }
    },
    
    async readData() {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    },
    
    async writeData(data) {
        data.lastUpdated = new Date().toISOString();
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    },
    
    async addGoal(text) {
        const data = await this.readData();
        const goalMatch = text.match(/add goal (.+)/i) || text.match(/set goal (.+)/i);
        
        if (!goalMatch) {
            return {
                success: false,
                message: "Please specify a goal. Example: 'add goal learn Spanish'"
            };
        }
        
        const goalDescription = goalMatch[1].trim();
        const goal = {
            id: Date.now().toString(),
            description: goalDescription,
            createdAt: new Date().toISOString(),
            progress: [],
            completed: false
        };
        
        data.goals.push(goal);
        await this.writeData(data);
        
        return {
            success: true,
            message: `Goal added: "${goalDescription}"`,
            data: goal
        };
    },
    
    async logProgress(text) {
        const data = await this.readData();
        const progressMatch = text.match(/log progress (.+)/i) || text.match(/update goal (.+)/i);
        
        if (!progressMatch) {
            return {
                success: false,
                message: "Please specify progress details. Example: 'log progress practiced Spanish for 30 minutes'"
            };
        }
        
        const progressText = progressMatch[1].trim();
        const progressEntry = {
            id: Date.now().toString(),
            text: progressText,
            timestamp: new Date().toISOString()
        };
        
        if (data.goals.length === 0) {
            return {
                success: false,
                message: "No goals found. Please add a goal first using 'add goal'."
            };
        }
        
        const latestGoal = data.goals[data.goals.length - 1];
        latestGoal.progress.push(progressEntry);
        await this.writeData(data);
        
        return {
            success: true,
            message: `Progress logged for "${latestGoal.description}": ${progressText}`,
            data: progressEntry
        };
    },
    
    async addHabit(text) {
        const data = await this.readData();
        const habitMatch = text.match(/add habit (.+)/i) || text.match(/track habit (.+)/i);
        
        if (!habitMatch) {
            return {
                success: false,
                message: "Please specify a habit. Example: 'add habit exercise daily'"
            };
        }
        
        const habitDescription = habitMatch[1].trim();
        const habit = {
            id: Date.now().toString(),
            description: habitDescription,
            createdAt: new Date().toISOString(),
            completions: [],
            streak: 0
        };
        
        data.habits.push(habit);
        await this.writeData(data);
        
        return {
            success: true,
            message: `Habit added: "${habitDescription}"`,
            data: habit
        };
    },
    
    async logHabitCompletion(text) {
        const data = await this.readData();
        const habitMatch = text.match(/log habit (.+)/i) || text.match(/habit done (.+)/i);
        
        if (!habitMatch && data.habits.length === 0) {
            return {
                success: false,
                message: "No habits found. Please add a habit first using 'add habit'."
            };
        }
        
        let targetHabit;
        if (habitMatch) {
            const habitDescription = habitMatch[1].trim().toLowerCase();
            targetHabit = data.habits.find(h => h.description.toLowerCase().includes(habitDescription));
        } else {
            targetHabit = data.habits[data.habits.length - 1];
        }
        
        if (!targetHabit) {
            return {
                success: false,
                message: "Habit not found. Please specify which habit you completed."
            };
        }
        
        const completion = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            notes: ""
        };
        
        targetHabit.completions.push(completion);
        
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const lastCompletion = targetHabit.completions.length > 1 ? 
            new Date(targetHabit.completions[targetHabit.completions.length - 2].timestamp).toDateString() : null;
        
        if (lastCompletion === yesterday) {
            targetHabit.streak += 1;
        } else if (lastCompletion !== today) {
            targetHabit.streak = 1;
        }
        
        await this.writeData(data);
        
        return {
            success: true,
            message: `Habit completed: "${targetHabit.description}" (Streak: ${targetHabit.streak} days)`,
            data: completion
        };
    },
    
    async showProgress() {
        const data = await this.readData();
        
        let message = "Your Self-Evolution Progress:\n\n";
        
        if (data.goals.length > 0) {
            message += "Goals:\n";
            data.goals.forEach(goal => {
                message += `- ${goal.description} (Progress entries: ${goal.progress.length})\n`;
            });
            message += "\n";
        }
        
        if (data.habits.length > 0) {
            message += "Habits:\n";
            data.habits.forEach(habit => {
                message += `- ${habit.description} (Streak: ${habit.streak} days, Total: ${habit.completions.length})\n`;
            });
            message += "\n";
        }
        
        if (data.journal.length > 0) {
            message += `Journal Entries: ${data.journal.length}\n\n`;
        }
        
        if (data.goals.length === 0 && data.habits.length === 0 && data.journal.length === 0) {
            message = "No progress data found. Start by adding goals or habits!";
        }
        
        return {
            success: true,
            message: message.trim(),
            data: data
        };
    },
    
    async addJournalEntry(text) {
        const data = await this.readData();
        const entryMatch = text.match(/journal (.+)/i) || text.match(/add entry (.+)/i);
        
        if (!entryMatch) {
            return {
                success: false,
                message: "Please specify journal entry content. Example: 'journal Feeling great after workout today'"
            };
        }
        
        const entryContent = entryMatch[1].trim();
        const entry = {
            id: Date.now().toString(),
            content: entryContent,
            timestamp: new Date().toISOString(),
            mood: this.detectMood(entryContent)
        };
        
        data.journal.push(entry);
        await this.writeData(data);
        
        return {
            success: true,
            message: `Journal entry added (detected mood: ${entry.mood})`,
            data: entry
        };
    },
    
    detectMood(text) {
        const positiveWords = ['happy', 'good', 'great', 'excellent', 'amazing', 'wonderful', 'productive', 'proud'];
        const negativeWords = ['sad', 'bad', 'tired', 'stressed', 'anxious', 'overwhelmed', 'frustrated'];
        
        const lowerText = text.toLowerCase();
        const positiveScore = positiveWords.filter(word => lowerText.includes(word)).length;
        const negativeScore = negativeWords.filter(word => lowerText.includes(word)).length;
        
        if (positiveScore > negativeScore) return 'positive';
        if (negativeScore > positiveScore) return 'negative';
        return 'neutral';
    }
};

export default plugin;