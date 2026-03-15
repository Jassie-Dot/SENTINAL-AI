import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TASKS_PATH = path.join(__dirname, '..', 'data', 'scheduled-tasks.json');
const MAX_TIMEOUT_MS = 2_147_483_647;

function parseRelativeTime(userInput = '') {
    const match = userInput.match(/\bin\s+(\d+)\s*(minute|minutes|hour|hours|day|days)\b/i);
    if (!match) {
        return null;
    }

    const amount = Number.parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const multipliers = {
        minute: 60_000,
        minutes: 60_000,
        hour: 3_600_000,
        hours: 3_600_000,
        day: 86_400_000,
        days: 86_400_000
    };

    return new Date(Date.now() + (amount * multipliers[unit]));
}

function parseAbsoluteTime(userInput = '') {
    const match = userInput.match(/\bat\s+(.+)$/i);
    if (!match) {
        return null;
    }

    const parsedDate = new Date(match[1].trim());
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function extractTaskName(userInput = '') {
    const scheduleMatch = userInput.match(/schedule\s+(.+?)\s+(?:at|in)\b/i);
    if (scheduleMatch) {
        return scheduleMatch[1].trim();
    }

    const remindMatch = userInput.match(/remind me about\s+(.+?)\s+(?:at|in)\b/i);
    if (remindMatch) {
        return remindMatch[1].trim();
    }

    return '';
}

const plugin = {
    name: 'task-scheduler',
    version: '1.1.0',
    description: 'Schedules lightweight reminders and persists them locally.',

    async initialize() {
        console.log('[task-scheduler] Plugin online');
        this.tasks = [];
        this.timeouts = new Map();

        await fs.promises.mkdir(path.dirname(TASKS_PATH), { recursive: true });
        if (fs.existsSync(TASKS_PATH)) {
            const saved = await fs.promises.readFile(TASKS_PATH, 'utf8');
            this.tasks = JSON.parse(saved);
        }

        this.tasks = this.tasks.filter(task => new Date(task.triggerAt).getTime() > Date.now());
        await this.saveTasks();
        this.tasks.forEach(task => this.armTask(task));
    },

    canHandle(intent, userInput) {
        return /\b(schedule|remind|reminder|list tasks)\b/i.test(userInput);
    },

    async handle(intent, userInput) {
        if (/\blist\b/i.test(userInput)) {
            if (!this.tasks.length) {
                return { success: true, message: 'No pending scheduled tasks.' };
            }

            const summary = this.tasks
                .sort((left, right) => new Date(left.triggerAt) - new Date(right.triggerAt))
                .map(task => `${task.taskName} -> ${new Date(task.triggerAt).toLocaleString()}`)
                .join('\n');

            return { success: true, message: summary };
        }

        const triggerAt = parseRelativeTime(userInput) || parseAbsoluteTime(userInput);
        const taskName = extractTaskName(userInput);

        if (!taskName || !triggerAt) {
            return {
                success: false,
                message: 'Use "schedule <task> at <date>" or "remind me about <task> in 10 minutes".'
            };
        }

        if (triggerAt.getTime() <= Date.now()) {
            return { success: false, message: 'The reminder time must be in the future.' };
        }

        const task = {
            id: randomUUID(),
            taskName,
            triggerAt: triggerAt.toISOString(),
            createdAt: new Date().toISOString()
        };

        this.tasks.push(task);
        await this.saveTasks();
        this.armTask(task);

        return {
            success: true,
            message: `Reminder scheduled for ${taskName} at ${triggerAt.toLocaleString()}.`
        };
    },

    async saveTasks() {
        await fs.promises.writeFile(TASKS_PATH, JSON.stringify(this.tasks, null, 2));
    },

    armTask(task) {
        const remaining = new Date(task.triggerAt).getTime() - Date.now();
        if (remaining <= 0) {
            this.completeTask(task.id);
            return;
        }

        const delay = Math.min(remaining, MAX_TIMEOUT_MS);
        const timeout = setTimeout(() => {
            if (remaining > MAX_TIMEOUT_MS) {
                this.armTask(task);
                return;
            }

            console.log(`[task-scheduler] Reminder: ${task.taskName}`);
            this.completeTask(task.id);
        }, delay);

        this.timeouts.set(task.id, timeout);
    },

    async completeTask(taskId) {
        const timeout = this.timeouts.get(taskId);
        if (timeout) {
            clearTimeout(timeout);
            this.timeouts.delete(taskId);
        }

        this.tasks = this.tasks.filter(task => task.id !== taskId);
        await this.saveTasks();
    }
};

export default plugin;
