import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EvolutionService } from './evolution.service.js';
import { EvolutionController } from './evolution.controller.js';

@Module({
  imports: [ConfigModule],
  controllers: [EvolutionController],
  providers: [EvolutionService],
  exports: [EvolutionService],
})
export class EvolutionModule {}
