import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { EvolutionService } from '../evolution/evolution.service.js';
export interface ReminderStats {
    totalSent: number;
    lastSentAt: string | null;
    targetGroup: string;
    cronExpression: string;
    isEnabled: boolean;
}
export declare class WaterReminderService implements OnModuleInit {
    private readonly configService;
    private readonly evolutionService;
    private readonly schedulerRegistry;
    private readonly logger;
    private totalSent;
    private lastSentAt;
    private messageIndex;
    private readonly reminderMessages;
    constructor(configService: ConfigService, evolutionService: EvolutionService, schedulerRegistry: SchedulerRegistry);
    onModuleInit(): void;
    private setupCronReminder;
    sendWaterReminder(customTarget?: string): Promise<{
        success: boolean;
        message: string;
        target: string;
    }>;
    getStats(): ReminderStats;
    getMessagesList(): string[];
}
