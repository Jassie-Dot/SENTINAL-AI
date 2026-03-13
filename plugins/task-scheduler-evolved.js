import fs 'fs';
import { setTimeout } from 'tim';
import schedule from 'node-schedule';
import from 'moment';

const plugin = {
 name: 'taskcheduler',
    version: '1.0.0',
    description 'Schedule and remind about future tasks. To use this plugin, you need provide your tasks in the format " task at <time>" or "remind me about <task> at <time>".',
    
    async initialize() {
        console.log('[task-scheduler] Plugin online');
        this.tasks = {};
        this.loadTasks();
        this.scheduleReminders();
    },
    
    canHandle(intent, userInput) {
        const keywords = ['schedule', 'remind', 'task'];
        return keywords.some(k => userInput.toLowerCase().includes(k));
    },
    
    async handle(intent, userInput, context) {
        if (userInput.toLowerCase().includes('schedule')) {
            const taskTime = userInput.match(/at (.*)/);
            const taskName = userInput.match(/schedule (.*) at/)[1];
            if (taskTime && taskName) {
                const time = taskTime[1];
                this.scheduleTask(taskName, time);
                return { success: true, message: `Task "${taskName}" scheduled for ${time}` };
            } else {
                return { success: false, message: 'Invalid task scheduling format. Please use "schedule task at <time>".' };
            }
        } else if (userInput.toLowerCase().includes('remind')) {
            const taskTime = userInput.match(/at (.*)/);
            const taskName = userInput.match(/remind me about (.*) at/)[1];
            if (taskTime && taskName) {
                const time = taskTime[1];
                this.scheduleReminder(taskName, time);
                return { success: true, message: `Reminder for "${taskName}" set for ${time}` };
            } else {
                return { success: false, message: 'Invalid reminder format. Please use "remind me about <task> at <time>".' };
            }
        } else {
            return { success: false, message: 'Unknown command' };
        }
    },
    
    loadTasks() {
        try {
            const data = fs.readFileSync('tasks.json');
            this.tasks = JSON.parse(data);
        } catch (err) {
            console.log('No tasks file found');
        }
    },
    
    saveTasks() {
        fs.writeFileSync('tasks.json', JSON.stringify(this.tasks));
    },
    
    scheduleTask(taskName, time) {
        const job = schedule.scheduleJob(time, () => {
            console.log(`Task "${taskName}" is due`);
        });
        this.tasks[taskName] = job;
        this.saveTasks();
    },
    
    scheduleReminder(taskName, time) {
        const job = schedule.scheduleJob(time, () => {
            console.log(`Reminder: "${taskName}"`);
        });
        this.tasks[taskName] = job;
        this.saveTasks();
    },
    
    scheduleReminders() {
        for (const taskName in this.tasks) {
            const job = this.tasks[taskName];
            job.reschedule(job.nextInvocation());
        }
    }
};
export default plugin;