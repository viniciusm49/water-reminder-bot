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
      getGroupParticipants: vi.fn().mockResolvedValue([
        { id: '558811111111@s.whatsapp.net', name: 'Fulano' },
        { id: '558822222222@s.whatsapp.net', name: 'Ciclano' },
      ]),
      getBotJid: vi.fn().mockResolvedValue('558899999999@s.whatsapp.net'),
      configureWebhook: vi.fn().mockResolvedValue({ status: 'SUCCESS' }),
    };

    configServiceMock = {
      get: vi.fn((key: string, defaultValue?: any) => {
        if (key === 'WATER_TARGET_GROUP_JID') return '120363123456789@g.us';
        if (key === 'WATER_REMINDER_ENABLED') return 'true';
        if (key === 'WATER_REMINDER_CRON') return '0 8-20/1 * * *';
        if (key === 'WATER_FOLLOWUP_DELAY_MINUTES') return '30';
        if (key === 'BOT_NAME') return 'reserva';
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

  it('deve enviar lembrete com sucesso para o grupo configurado e iniciar rodada', async () => {
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
    expect(stats.activeRound).toBeDefined();
    expect(stats.activeRound?.totalParticipants).toBe(2);
    expect(stats.activeRound?.pendingCount).toBe(2);
  });

  it('deve avisar se nenhum grupo for configurado', async () => {
    (configServiceMock.get as any).mockReturnValueOnce(''); // target group vazio
    const result = await service.sendWaterReminder();
    expect(result.success).toBe(false);
    expect(result.message).toContain('Nenhum grupo de destino configurado');
  });

  it('deve reconhecer confirmações legítimas e NÃO aceitar risadas ou negações', () => {
    // Risadas NUNCA devem confirmar
    expect(service.isOkConfirmation('🤣🤣🤣🤣🤣🤣🤣🤣')).toBe(false);
    expect(service.isOkConfirmation('😂😂😂')).toBe(false);
    expect(service.isOkConfirmation('kkkkkkkkkkkkkkkkkkk')).toBe(false);
    expect(service.isOkConfirmation('kkk')).toBe(false);
    expect(service.isOkConfirmation('hahaha engraçado')).toBe(false);
    expect(service.isOkConfirmation('rsrsrs')).toBe(false);
    expect(service.isOkConfirmation('kakakakakakakkakaak')).toBe(false);

    // Negações NUNCA devem confirmar
    expect(service.isOkConfirmation('N dei ok aimda')).toBe(false);
    expect(service.isOkConfirmation('não bebi ainda')).toBe(false);
    expect(service.isOkConfirmation('ainda não')).toBe(false);
    expect(service.isOkConfirmation('n dei ok')).toBe(false);

    // Frases aleatórias
    expect(service.isOkConfirmation('qualquer outro assunto sem confirmacao')).toBe(false);
    expect(service.isOkConfirmation('Valeu meu fi')).toBe(false);

    // Confirmações VÁLIDAS
    expect(service.isOkConfirmation('ok')).toBe(true);
    expect(service.isOkConfirmation('OK')).toBe(true);
    expect(service.isOkConfirmation('okk')).toBe(true);
    expect(service.isOkConfirmation('Okay')).toBe(true);
    expect(service.isOkConfirmation('ta ok já bebi')).toBe(true);
    expect(service.isOkConfirmation('já tomei água')).toBe(true);
    expect(service.isOkConfirmation('bebi')).toBe(true);
    expect(service.isOkConfirmation('tomei')).toBe(true);
    expect(service.isOkConfirmation('hidratado')).toBe(true);
    expect(service.isOkConfirmation('hidratada')).toBe(true);
    expect(service.isOkConfirmation('blz')).toBe(true);
    expect(service.isOkConfirmation('👍')).toBe(true);
    expect(service.isOkConfirmation('✅')).toBe(true);
    expect(service.isOkConfirmation('💧')).toBe(true);
  });

  it('deve processar mensagem de OK de participante e responder com elogio', async () => {
    await service.sendWaterReminder();

    const handled = await service.handleIncomingMessage({
      event: 'messages.upsert',
      data: {
        key: {
          remoteJid: '120363123456789@g.us',
          participant: '558811111111@s.whatsapp.net',
          fromMe: false,
        },
        pushName: 'Vinicius',
        message: {
          conversation: 'ok já bebi meu copo!',
        },
      },
    });

    expect(handled).toBe(true);
    expect(evolutionServiceMock.sendTextMessage).toHaveBeenCalledWith(
      '120363123456789@g.us',
      expect.stringMatching(/Vinicius/),
      ['558811111111@s.whatsapp.net'],
    );

    const round = service.getActiveRoundDetails();
    expect(round.confirmedCount).toBe(1);
    expect(round.pendingCount).toBe(1);
  });

  it('deve ignorar risos no webhook sem confirmar participante', async () => {
    await service.sendWaterReminder();

    const handled = await service.handleIncomingMessage({
      event: 'messages.upsert',
      data: {
        key: {
          remoteJid: '120363123456789@g.us',
          participant: '558811111111@s.whatsapp.net',
          fromMe: false,
        },
        pushName: 'Amor ❤️',
        message: {
          conversation: '🤣🤣🤣🤣🤣🤣🤣🤣',
        },
      },
    });

    expect(handled).toBe(false);

    const round = service.getActiveRoundDetails();
    expect(round.confirmedCount).toBe(0);
    expect(round.pendingCount).toBe(2);
  });

  it('deve disparar follow-up 1 de cobrança para pendentes', async () => {
    await service.sendWaterReminder();

    const followupResult = await service.triggerManualFollowup('1');
    expect(followupResult.success).toBe(true);

    expect(evolutionServiceMock.sendTextMessage).toHaveBeenCalledWith(
      '120363123456789@g.us',
      expect.stringMatching(/COBRANÇA DA ÁGUA|PATRULHA|ALERTA DE DESERTO|CHECAGEM/),
      expect.arrayContaining(['558811111111@s.whatsapp.net', '558822222222@s.whatsapp.net']),
    );
  });

  it('deve retornar lista de mensagens disponíveis e categorizadas', () => {
    const messages = service.getMessagesList();
    expect(messages.length).toBeGreaterThanOrEqual(20);
    expect(messages[0]).toContain('HORA DE BEBER ÁGUA');

    const categorized = service.getCategorizedMessages();
    expect(categorized.categories.originais.length).toBe(6);
    expect(categorized.categories.manha.length).toBeGreaterThan(0);
    expect(categorized.categories.tarde.length).toBeGreaterThan(0);
    expect(categorized.categories.noite.length).toBeGreaterThan(0);
    expect(categorized.categories.humorEMemes.length).toBeGreaterThan(0);
    expect(categorized.categories.elogiosEParabensOK.length).toBeGreaterThan(0);
    expect(categorized.categories.cobranca1MeiaHora.length).toBeGreaterThan(0);
    expect(categorized.categories.cobranca2UmaHora.length).toBeGreaterThan(0);
  });

  it('deve ignorar o próprio número do bot mesmo com sufixo de dispositivo (:12) ou nome Reserva', async () => {
    (evolutionServiceMock.getBotJid as any).mockResolvedValue('558822222222@s.whatsapp.net');

    (evolutionServiceMock.getGroupParticipants as any).mockResolvedValue([
      { id: '558811111111@s.whatsapp.net', name: 'Vinicius' },
      { id: '558822222222:12@s.whatsapp.net', name: 'Reserva' },
    ]);

    await service.sendWaterReminder();

    const round = service.getActiveRoundDetails();
    // Apenas o número humano (11111111) deve constar, o bot (22222222) deve ser completamente excluído!
    expect(round.totalParticipants).toBe(1);
    expect(round.pendingList).toHaveLength(1);
    expect(round.pendingList[0].jid).toBe('558811111111@s.whatsapp.net');

    // Mensagem enviada pelo bot não deve acionar verificação
    const handledBotMessage = await service.handleIncomingMessage({
      event: 'messages.upsert',
      data: {
        key: {
          remoteJid: '120363123456789@g.us',
          participant: '558822222222:12@s.whatsapp.net',
          fromMe: false,
        },
        pushName: 'Reserva',
        message: { conversation: 'ok' },
      },
    });
    expect(handledBotMessage).toBe(false);
  });
});
