import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WaterReminderService } from './water-reminder.service.js';

@Controller('reminder')
export class WaterReminderController {
  constructor(private readonly waterReminderService: WaterReminderService) {}

  @Get('trigger')
  async triggerReminderGet(@Query('target') target?: string) {
    return this.waterReminderService.sendWaterReminder(target);
  }

  @Post('trigger')
  async triggerReminderPost(@Body() body: { target?: string } = {}) {
    return this.waterReminderService.sendWaterReminder(body?.target);
  }

  @Get('status')
  getStatus() {
    return {
      success: true,
      data: this.waterReminderService.getStats(),
    };
  }

  @Get('preview')
  getPreview() {
    return {
      success: true,
      data: this.waterReminderService.getCategorizedMessages(),
    };
  }
}
