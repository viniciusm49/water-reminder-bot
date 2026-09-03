import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { EvolutionModule } from './evolution/evolution.module.js';
import { WaterReminderModule } from './reminder/water-reminder.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EvolutionModule,
    WaterReminderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
