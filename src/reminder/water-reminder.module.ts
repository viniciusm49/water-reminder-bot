import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WaterReminderService } from './water-reminder.service.js';
import { WaterReminderController } from './water-reminder.controller.js';
import { EvolutionModule } from '../evolution/evolution.module.js';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    EvolutionModule,
  ],
  controllers: [WaterReminderController],
  providers: [WaterReminderService],
  exports: [WaterReminderService],
})
export class WaterReminderModule {}
