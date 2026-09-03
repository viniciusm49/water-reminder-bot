import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { WaterReminderService } from './water-reminder.service.js';
import { EvolutionService } from '../evolution/evolution.service.js';

describe('WaterReminderService', () => {
  let service: WaterReminderService;
  let evolutionServiceMock: Partial<EvolutionService>;
  let configServiceMock: Partial<ConfigService>;
  let schedulerRegistryMock: Partial<SchedulerRegistry>;

  beforeEach(async () => {
    evolutionServiceMock = {
      sendTextMessage: vi.fn().mockResolvedValue({ status: 'SUCCESS' }),
    };

    configServiceMock = {
      get: vi.fn((key: string, defaultValue?: any) => {
        if (key === 'WATER_TARGET_GROUP_JID') return '120363123456789@g.us';
        if (key === 'WATER_REMINDER_ENABLED') return 'true';
        if (key === 'WATER_REMINDER_CRON') return '0 8-20/1 * * *';
        return defaultValue;
      }),
    };

    schedulerRegistryMock = {
      addCronJob: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaterReminderService,
        { provide: EvolutionService, useValue: evolutionServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: SchedulerRegistry, useValue: schedulerRegistryMock },
      ],
    }).compile();

    service = module.get<WaterReminderService>(WaterReminderService);
  });

  it('deve ser instanciado com sucesso', () => {
    expect(service).toBeDefined();
  });

  it('deve enviar lembrete com sucesso para o grupo configurado', async () => {
    const result = await service.sendWaterReminder();
    expect(result.success).toBe(true);
    expect(result.target).toBe('120363123456789@g.us');
    expect(evolutionServiceMock.sendTextMessage).toHaveBeenCalledWith(
      '120363123456789@g.us',
      expect.stringMatching(/água/i),
    );

    const stats = service.getStats();
    expect(stats.totalSent).toBe(1);
    expect(stats.lastSentAt).toBeDefined();
    expect(stats.totalMessagesAvailable).toBeGreaterThanOrEqual(20);
  });

  it('deve avisar se nenhum grupo for configurado', async () => {
    (configServiceMock.get as any).mockReturnValueOnce(''); // target group vazio
    const result = await service.sendWaterReminder();
    expect(result.success).toBe(false);
    expect(result.message).toContain('Nenhum grupo de destino configurado');
  });

  it('deve retornar lista de mensagens disponíveis e manter as originais', () => {
    const messages = service.getMessagesList();
    expect(messages.length).toBeGreaterThanOrEqual(20);
    expect(messages[0]).toContain('HORA DE BEBER ÁGUA');

    const categorized = service.getCategorizedMessages();
    expect(categorized.categories.originais.length).toBe(6);
    expect(categorized.categories.manha.length).toBeGreaterThan(0);
    expect(categorized.categories.tarde.length).toBeGreaterThan(0);
    expect(categorized.categories.noite.length).toBeGreaterThan(0);
    expect(categorized.categories.humorEMemes.length).toBeGreaterThan(0);
  });
});
