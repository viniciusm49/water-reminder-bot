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

  @Get('round')
  getRound() {
    return {
      success: true,
      data: this.waterReminderService.getActiveRoundDetails(),
    };
  }

  @Get('trigger-followup')
  async triggerFollowupGet(@Query('step') step: '1' | '2' = '1') {
    return this.waterReminderService.triggerManualFollowup(step);
  }

  @Post('trigger-followup')
  async triggerFollowupPost(@Body() body: { step?: '1' | '2' } = {}) {
    return this.waterReminderService.triggerManualFollowup(body?.step || '1');
  }

  @Post('simulate-ok')
  async simulateOk(
    @Body() body: { participant?: string; name?: string; text?: string },
  ) {
    const participant = body?.participant || '558899999999@s.whatsapp.net';
    const name = body?.name || 'Fulano';
    const text = body?.text || 'ok';
    const isOk = this.waterReminderService.isOkConfirmation(text);

    if (isOk) {
      await this.waterReminderService.handleIncomingMessage({
        event: 'messages.upsert',
        data: {
          key: {
            remoteJid: this.waterReminderService.getStats().targetGroup,
            participant,
            fromMe: false,
          },
          pushName: name,
          message: {
            conversation: text,
          },
        },
      });
      return {
        success: true,
        message: `Simulação de OK executada com sucesso para ${name}.`,
        isOk,
      };
    }

    return {
      success: false,
      message: `O texto "${text}" não foi reconhecido como confirmação.`,
      isOk,
    };
  }
}
