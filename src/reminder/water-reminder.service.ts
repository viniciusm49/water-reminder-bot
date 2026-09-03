import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { EvolutionService } from '../evolution/evolution.service.js';

export interface ReminderStats {
  totalSent: number;
  lastSentAt: string | null;
  targetGroup: string;
  cronExpression: string;
  isEnabled: boolean;
}

@Injectable()
export class WaterReminderService implements OnModuleInit {
  private readonly logger = new Logger(WaterReminderService.name);
  private totalSent = 0;
  private lastSentAt: Date | null = null;
  private messageIndex = 0;

  private readonly reminderMessages: string[] = [
    '💧 *HORA DE BEBER ÁGUA!* 💧\n\nSeu corpo e sua mente precisam de hidratação para funcionar no 100%! Levante, pegue um copão d\'água (250ml - 300ml) e beba agora! 🚰⚡',
    '🌊 *ALERTA DE HIDRATAÇÃO!* 🌊\n\nPausa rápida no trabalho: vá até a cozinha/filtro e tome água! Beber água regularmente melhora o foco, alivia o cansaço e previne dores de cabeça. 🧠✨',
    '🧊 *CHEGOU A NOTIFICAÇÃO DA SAÚDE!* 🧊\n\nMais um copo de água pra conta! Rins funcionando limpos, pele hidratada e energia renovada. Já bebeu o seu copo agora? 🥤💦',
    '🚰 *DROPS DE SAÚDE - HORA DA ÁGUA:* 🚰\n\nSabia que quando você sente sede seu corpo já começou a desidratar? Não espere a sede bater: encha a garrafa e tome alguns bons goles! 🏃‍♂️💨',
    '🔋 *RECARREGUE A BATERIA HÍDRICA:* 🔋\n\nMetade do seu cansaço diário pode ser simplesmente falta de água! Beba 1 copo d\'água gelada agora e sinta a diferença no seu dia. 💧🏆',
    '✨ *META DO DIA: BEM HIDRATADO!* ✨\n\nCada copo conta para sua meta diária de 2 a 3 litros. Bora beber água agora! 💦🥛',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly evolutionService: EvolutionService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    this.setupCronReminder();
  }

  /**
   * Configura o cron dinamicamente de acordo com o .env
   */
  private setupCronReminder() {
    const isEnabled = this.configService.get<string>('WATER_REMINDER_ENABLED', 'true') === 'true';
    // Padrão: de hora em hora entre 08:00 e 20:00 (todos os dias)
    const cronExpression = this.configService.get<string>('WATER_REMINDER_CRON', '0 8-20/1 * * *');
    const targetGroup = this.configService.get<string>('WATER_TARGET_GROUP_JID', '');

    if (!isEnabled) {
      this.logger.warn('Lembretes automáticos de água estão desativados (WATER_REMINDER_ENABLED=false).');
      return;
    }

    try {
      const job = new CronJob(cronExpression, async () => {
        this.logger.log('Disparo do Cron de Lembrete de Água acionado.');
        try {
          await this.sendWaterReminder();
        } catch (err: any) {
          this.logger.error(`Erro ao disparar lembrete agendado: ${err.message}`);
        }
      });

      this.schedulerRegistry.addCronJob('water-reminder-cron', job);
      job.start();

      this.logger.log(`Cron de lembrete de água registrado com sucesso! Expressão: "${cronExpression}"`);
      if (!targetGroup) {
        this.logger.warn('⚠️ ATENÇÃO: WATER_TARGET_GROUP_JID ainda não foi configurado no .env! Acesse http://localhost:3000/evolution/groups para encontrar o JID do seu grupo.');
      } else {
        this.logger.log(`Grupo de destino configurado: ${targetGroup}`);
      }
    } catch (err: any) {
      this.logger.error(`Erro ao registrar cron "${cronExpression}": ${err.message}`);
    }
  }

  /**
   * Envia a mensagem de lembrete para o grupo configurado ou especificado
   */
  async sendWaterReminder(customTarget?: string): Promise<{ success: boolean; message: string; target: string }> {
    const target = customTarget || this.configService.get<string>('WATER_TARGET_GROUP_JID', '');

    if (!target) {
      const msg = 'Nenhum grupo de destino configurado! Defina WATER_TARGET_GROUP_JID no .env ou envie o parâmetro customTarget.';
      this.logger.warn(msg);
      return { success: false, message: msg, target: '' };
    }

    // Seleciona a próxima mensagem em rotação
    const textToSend = this.reminderMessages[this.messageIndex % this.reminderMessages.length];
    this.messageIndex++;

    this.logger.log(`Enviando lembrete de água para o grupo/número ${target}...`);
    await this.evolutionService.sendTextMessage(target, textToSend);

    this.totalSent++;
    this.lastSentAt = new Date();

    this.logger.log(`Lembrete de água enviado com sucesso para ${target}! Total enviados hoje: ${this.totalSent}`);

    return {
      success: true,
      message: textToSend,
      target,
    };
  }

  /**
   * Retorna estatísticas e configurações atuais do lembrete
   */
  getStats(): ReminderStats {
    return {
      totalSent: this.totalSent,
      lastSentAt: this.lastSentAt ? this.lastSentAt.toISOString() : null,
      targetGroup: this.configService.get<string>('WATER_TARGET_GROUP_JID', 'Não configurado'),
      cronExpression: this.configService.get<string>('WATER_REMINDER_CRON', '0 8-20/1 * * *'),
      isEnabled: this.configService.get<string>('WATER_REMINDER_ENABLED', 'true') === 'true',
    };
  }

  /**
   * Lista os modelos de mensagens de lembrete
   */
  getMessagesList(): string[] {
    return this.reminderMessages;
  }
}
