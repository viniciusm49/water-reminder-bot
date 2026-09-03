import { WaterReminderService } from './water-reminder.service.js';
export declare class WaterReminderController {
    private readonly waterReminderService;
    constructor(waterReminderService: WaterReminderService);
    triggerReminder(body?: {
        target?: string;
    }): Promise<{
        success: boolean;
        message: string;
        target: string;
    }>;
    getStatus(): {
        success: boolean;
        data: import("./water-reminder.service.js").ReminderStats;
    };
    getPreview(): {
        success: boolean;
        messages: string[];
    };
}
