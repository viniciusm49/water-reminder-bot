import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EvolutionService } from './evolution.service.js';
import { EvolutionController } from './evolution.controller.js';
import { WaterReminderModule } from '../reminder/water-reminder.module.js';

@Module({
  imports: [ConfigModule, forwardRef(() => WaterReminderModule)],
  controllers: [EvolutionController],
  providers: [EvolutionService],
  exports: [EvolutionService],
})
export class EvolutionModule {}
