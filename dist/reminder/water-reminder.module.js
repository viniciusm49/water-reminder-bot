var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WaterReminderService } from './water-reminder.service.js';
import { WaterReminderController } from './water-reminder.controller.js';
import { EvolutionModule } from '../evolution/evolution.module.js';
let WaterReminderModule = class WaterReminderModule {
};
WaterReminderModule = __decorate([
    Module({
        imports: [
            ConfigModule,
            ScheduleModule.forRoot(),
            EvolutionModule,
        ],
        controllers: [WaterReminderController],
        providers: [WaterReminderService],
        exports: [WaterReminderService],
    })
], WaterReminderModule);
export { WaterReminderModule };
//# sourceMappingURL=water-reminder.module.js.map