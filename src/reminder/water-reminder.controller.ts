import { Body, Controller, Get, Post } from '@nestjs/common';
import { WaterReminderService } from './water-reminder.service.js';

@Controller('reminder')
export class WaterReminderController {
  constructor(private readonly waterReminderService: WaterReminderService) {}

  @Post('trigger')
  async triggerReminder(@Body() body: { target?: string } = {}) {
    const result = await this.waterReminderService.sendWaterReminder(body?.target);
    return result;
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
      messages: this.waterReminderService.getMessagesList(),
    };
  }
}
