/**
 * Calendar & Reminder Plugin for SENTINAL
 * Manages reminders and calendar events
 */

import fs from 'fs';
import path from 'path';
import cron from 'node-cron';

const REMINDERS_FILE = path.join(process.cwd(), 'reminders.json');

const plugin = {
    name: 'Calendar',
    version: '1.0.0',
    description: 'Calendar and reminder management system',
    reminders: [],
    scheduledTasks: new Map(),

    async initialize() {
        this.loadReminders();
        this.scheduleReminders();
        console.log(`[CALENDAR] Plugin initialized with ${this.reminders.length} reminders`);
    },

    async cleanup() {
        this.saveReminders();
        // Cancel all scheduled tasks
        for (const task of this.scheduledTasks.values()) {
            task.stop();
        }
        console.log('[CALENDAR] Plugin cleanup complete');
    },

    loadReminders() {
        if (fs.existsSync(REMINDERS_FILE)) {
            try {
                const data = fs.readFileSync(REMINDERS_FILE, 'utf8');
                this.reminders = JSON.parse(data);
            } catch (error) {
                console.error('[CALENDAR] Failed to load reminders:', error.message);
                this.reminders = [];
            }
        }
    },

    saveReminders() {
        try {
            fs.writeFileSync(REMINDERS_FILE, JSON.stringify(this.reminders, null, 2));
        } catch (error) {
            console.error('[CALENDAR] Failed to save reminders:', error.message);
        }
    },

    scheduleReminders() {
        // Clear existing scheduled tasks
        for (const task of this.scheduledTasks.values()) {
            task.stop();
        }
        this.scheduledTasks.clear();

        // Schedule active reminders
        const now = new Date();
        this.reminders.forEach(reminder => {
            if (reminder.status === 'active') {
                const reminderTime = new Date(reminder.time);

                if (reminderTime > now) {
                    // Calculate cron expression
                    const cronExpr = this.getCronExpression(reminderTime);

                    try {
                        const task = cron.schedule(cronExpr, () => {
                            this.triggerReminder(reminder.id);
                        });

                        this.scheduledTasks.set(reminder.id, task);
                    } catch (error) {
                        console.error(`[CALENDAR] Failed to schedule reminder ${reminder.id}:`, error.message);
                    }
                }
            }
        });
    },

    getCronExpression(date) {
        // Format: minute hour day month dayOfWeek
        return `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
    },

    triggerReminder(id) {
        const reminder = this.reminders.find(r => r.id === id);
        if (reminder) {
            console.log(`[CALENDAR] 🔔 REMINDER: ${reminder.text}`);
            reminder.status = 'completed';
            reminder.triggeredAt = new Date().toISOString();
            this.saveReminders();

            // TODO: Emit event for UI notification
        }
    },

    canHandle(intent, userInput) {
        return intent === 'calendar.create' ||
            intent === 'calendar.list' ||
            /remind|reminder|schedule a meeting/i.test(userInput);
    },

    async handle(intent, userInput, context) {
        // BUGFIX: Prevent recursive reminders by ignoring system confirmation messages
        if (userInput.startsWith("Reminder set for") || userInput.startsWith("I'll notify you")) {
            return {
                success: false,
                message: "Ignored system confirmation echo."
            };
        }

        if (intent === 'calendar.create' || /remind me/i.test(userInput)) {
            // Validate: Don't create reminder if it looks like a game request
            if (/play|game/i.test(userInput) && !/remind/i.test(userInput)) {
                return { success: false, message: "Use the game plugin for playing." };
            }
            return this.createReminder(userInput, context.entities);
        }

        if (intent === 'calendar.list' || /list|show.*reminder/i.test(userInput)) {
            return this.listReminders();
        }

        return {
            success: false,
            message: "I'm not sure what you'd like me to do with the calendar, Sir."
        };
    },

    createReminder(userInput, entities) {
        // Extract reminder text
        let reminderText = entities.reminderText || userInput.replace(/remind me to /i, '').trim();

        // Extract time (simplified for now)
        let reminderTime;
        const timeEntity = entities.time;

        if (timeEntity) {
            if (/in\s+(\d+)\s+(minute|hour|day)s?/i.test(timeEntity)) {
                const match = timeEntity.match(/in\s+(\d+)\s+(minute|hour|day)s?/i);
                const amount = parseInt(match[1]);
                const unit = match[2].toLowerCase();

                reminderTime = new Date();
                if (unit === 'minute') reminderTime.setMinutes(reminderTime.getMinutes() + amount);
                else if (unit === 'hour') reminderTime.setHours(reminderTime.getHours() + amount);
                else if (unit === 'day') reminderTime.setDate(reminderTime.getDate() + amount);
            }
        } else {
            // Default to 1 hour from now
            reminderTime = new Date();
            reminderTime.setHours(reminderTime.getHours() + 1);
        }

        const reminder = {
            id: Date.now().toString(),
            text: reminderText,
            time: reminderTime.toISOString(),
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        this.reminders.push(reminder);
        this.saveReminders();
        this.scheduleReminders();

        const timeStr = reminderTime.toLocaleString();
        return {
            success: true,
            message: `Reminder set for ${timeStr}, Sir. I'll notify you: "${reminderText}"`,
            data: reminder
        };
    },

    listReminders() {
        const activeReminders = this.reminders.filter(r => r.status === 'active');

        if (activeReminders.length === 0) {
            return {
                success: true,
                message: "You have no active reminders, Sir. Your schedule is clear.",
                data: []
            };
        }

        let message = `You have ${activeReminders.length} active reminder${activeReminders.length > 1 ? 's' : ''}, Sir:\n\n`;

        activeReminders.sort((a, b) => new Date(a.time) - new Date(b.time));

        activeReminders.forEach((r, i) => {
            const time = new Date(r.time).toLocaleString();
            message += `${i + 1}. ${r.text} - ${time}\n`;
        });

        return {
            success: true,
            message: message.trim(),
            data: activeReminders
        };
    }
};

export default plugin;
