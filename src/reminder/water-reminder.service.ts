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
  totalMessagesAvailable: number;
}

export type DayPeriod = 'morning' | 'afternoon' | 'evening';

@Injectable()
export class WaterReminderService implements OnModuleInit {
  private readonly logger = new Logger(WaterReminderService.name);
  private totalSent = 0;
  private lastSentAt: Date | null = null;
  private lastMessageSent = '';
  private messageIndex = 0;

  // 1. Mensagens Originais (Gerais) - Mantidas intactas
  private readonly originalMessages: string[] = [
    '💧 *HORA DE BEBER ÁGUA!* 💧\n\nSeu corpo e sua mente precisam de hidratação para funcionar no 100%! Levante, pegue um copão d\'água (250ml - 300ml) e beba agora! 🚰⚡',
    '🌊 *ALERTA DE HIDRATAÇÃO!* 🌊\n\nPausa rápida no trabalho: vá até a cozinha/filtro e tome água! Beber água regularmente melhora o foco, alivia o cansaço e previne dores de cabeça. 🧠✨',
    '🧊 *CHEGOU A NOTIFICAÇÃO DA SAÚDE!* 🧊\n\nMais um copo de água pra conta! Rins funcionando limpos, pele hidratada e energia renovada. Já bebeu o seu copo agora? 🥤💦',
    '🚰 *DROPS DE SAÚDE - HORA DA ÁGUA:* 🚰\n\nSabia que quando você sente sede seu corpo já começou a desidratar? Não espere a sede bater: encha a garrafa e tome alguns bons goles de água! 🏃‍♂️💨',
    '🔋 *RECARREGUE A BATERIA HÍDRICA:* 🔋\n\nMetade do seu cansaço diário pode ser simplesmente falta de água! Beba 1 copo d\'água gelada agora e sinta a diferença no seu dia. 💧🏆',
    '✨ *META DO DIA: BEM HIDRATADO!* ✨\n\nCada copo conta para sua meta diária de 2 a 3 litros. Bora beber água agora! 💦🥛',
  ];

  // 2. Mensagens Matinais (05:00 - 11:59)
  private readonly morningMessages: string[] = [
    '🌅 *BOM DIA, PLANTA QUE FALA!* 🌱☀️\n\nAcordou? O motor biológico já tá ligado, mas cadê o combustível? Café é ótimo, mas o seu corpo precisa de ÁGUA pra ligar as engrenagens. Enche um copão agora e manda pra dentro! 🥛⚡',
    '☀️ *CHECK MATINAL DA ÁGUA!* 💧\n\nVocê acabou de passar 7 ou 8 horas dormindo sem beber uma gota de água. Seu cérebro tá em modo economia de bateria! Tome 300ml de água agora antes de começar o dia. 🚀🧠',
    '🍳 *CAFÉ DA MANHÃ COM ÁGUA:* ☕💧\n\nSabia que beber água pela manhã acelera seu metabolismo em até 30% e acorda os órgãos? Bora dar partida no organismo: beba seu copo de água matinal agora! 🏁✨',
    '🐔 *O GALO CANTOU, HORA DA ÁGUA!* 🐓💦\n\nAntes de abrir a primeira planilha ou responder o primeiro e-mail do dia, cumpra seu dever sagrado com os seus rins: beba água fresca agora! 🚰😄',
  ];

  // 3. Mensagens da Tarde (12:00 - 17:59)
  private readonly afternoonMessages: string[] = [
    '🥱 *ANTI-SONINHO PÓS-ALMOÇO:* 🥊😴\n\nAquele peso nas pálpebras às 14h não é só a digestão, é falta de água também! Em vez do terceiro café do dia, tome 1 copo grande de água bem gelada. O foco volta na hora! 🧊🎯',
    '☀️ *CALOR E RENDIMENTO DA TARDE:* 🌡️🥤\n\nA tarde tá voando e a sua garrafa de água continua cheia no mesmo lugar? Ela não é item de decoração de mesa! Levante, tome sua água agora e faça seus rins sorrirem. 😃💦',
    '⏳ *RETA FINAL DO DIA COM ÁGUA:* 🏁💧\n\nPassou da metade do expediente! Pra não terminar o dia com dor de cabeça e exaustão, tome mais 300ml de água agora. Bora garantir a produtividade até o final! 💻⚡',
    '👀 *FLAGRA DA TARDE:* 🔍🚰\n\nTe peguei olhando pra tela sem piscar há horas! Pausa de 30 segundos: estique a coluna, respire fundo e beba água agora mesmo! Seu corpo agradece. 💆‍♂️✨',
  ];

  // 4. Mensagens da Noite (18:00 - 04:59)
  private readonly eveningMessages: string[] = [
    '🌙 *BOA NOITE E FECHAMENTO DA META:* 🌃💧\n\nFim de expediente ou já relaxando no sofá? Não vá dormir desidratado! Tome um copo de água agora para ajudar seu corpo a se regenerar durante o sono. 🛌✨',
    '🎯 *ÚLTIMO GÁS DA ÁGUA NO DIA:* 🏆🚰\n\nQuantos copos de água você tomou hoje? Se ainda faltam alguns pra bater a meta dos 2 a 3 litros, hora de beber água agora e fechar o dia com chave de ouro! 🥇💦',
    '🛋️ *RELAXANDO EM CASA?* 📺💧\n\nAntes de maratonar aquela série ou dormir, busque um copo de água fresca! A hidratação noturna previne cãibras e melhora a qualidade do sono. 😴💤',
  ];

  // 5. Mensagens Bem-Humoradas / Memes (Qualquer Horário)
  private readonly humorousMessages: string[] = [
    '🪨 *COMUNICADO DO DEPARTAMENTO DE UROLOGIA:* ⚠️😂\n\nLembrete amigável: pedra no rim NÃO é minério valioso e NÃO dá pra colecionar! Beba água agora pra não chorar de dor na sala de espera do hospital depois. Se hidrate! 🚑💧',
    '🌵 *SAI DESSE MODO CACTO:* 🌵💦\n\nVocê não é uma suculenta pra ficar dias sem beber água não, criatura! Beba água imediatamente antes que você comece a fazer fotossíntese sem querer. 😂🚰',
    '☕ *ALERTA CIENTÍFICO: CAFÉ NÃO É ÁGUA!* 🚫☕➡️💧\n\n"Ah, mas eu tomei 4 xícaras de café hoje!" Parabéns, seu sangue agora tem a densidade do petróleo. Café não substitui o sagrado copo de água! Levante e tome água agora. 🏃‍♂️💨',
    '🥂 *BRINDE AO DRINK MAIS BARATO DO MUNDO:* 💸✨\n\nÁgua: 0 calorias, quase de graça e 100% de benefícios pra saúde. Um brinde à sua pele de bebê e rins filtrando com maestria. Beba água agora! 🍻💦',
    '🤖 *MENSAGEM AUTOMÁTICA DO SEU RIM:* 💌🫘\n\n"Querido humano: favor mandar água. Estou filtrando as coisas aqui na base da força do ódio e da poeira. Grato, Seu Rim." Beba água agora pelo amor de Deus! 😅🚰',
    '🔋 *STATUS DO SISTEMA HUMANO:* ⚠️🪫\n\nNível de bateria: 18%. Modo economia ativado. Para restaurar o desempenho de fábrica, insira 300ml de água fria no organismo imediatamente! 💧🔌',
    '🥤 *DISK-ÁGUA EM AÇÃO:* 📞🚨\n\nAlô? É da patrulha da hidratação! Recebemos uma denúncia anônima de alguém aí há horas sem beber água. O copo é a fiança: beba água agora e seja liberado! 👮‍♂️💦',
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
        this.logger.warn('⚠️ ATENÇÃO: WATER_TARGET_GROUP_JID ainda não foi configurado no .env! Acesse /evolution/groups para encontrar o JID do seu grupo.');
      } else {
        this.logger.log(`Grupo de destino configurado: ${targetGroup}`);
      }
    } catch (err: any) {
      this.logger.error(`Erro ao registrar cron "${cronExpression}": ${err.message}`);
    }
  }

  /**
   * Determina o período do dia (horário de Brasília)
   */
  getCurrentPeriod(): DayPeriod {
    const tz = this.configService.get<string>('REMINDER_TIMEZONE', 'America/Sao_Paulo');
    try {
      const hourStr = new Date().toLocaleTimeString('pt-BR', { timeZone: tz, hour: '2-digit', hour12: false });
      const hour = parseInt(hourStr, 10);
      if (hour >= 5 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 18) return 'afternoon';
      return 'evening';
    } catch (e) {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 18) return 'afternoon';
      return 'evening';
    }
  }

  /**
   * Seleciona a próxima mensagem levando em conta o período do dia e humor,
   * garantindo variedade e evitando repetição da última mensagem enviada.
   */
  getNextMessage(): string {
    const period = this.getCurrentPeriod();
    let periodPool: string[];

    switch (period) {
      case 'morning':
        periodPool = this.morningMessages;
        break;
      case 'afternoon':
        periodPool = this.afternoonMessages;
        break;
      case 'evening':
      default:
        periodPool = this.eveningMessages;
        break;
    }

    // O conjunto de candidatos combina: mensagens do período atual + bem-humoradas + originais
    const eligiblePool = [
      ...periodPool,
      ...this.humorousMessages,
      ...this.originalMessages,
    ];

    // Filtra para evitar repetir exatamente a última mensagem enviada
    const filteredPool = eligiblePool.filter((m) => m !== this.lastMessageSent);
    const poolToUse = filteredPool.length > 0 ? filteredPool : eligiblePool;

    // Seleção com rotação + variedade
    const selected = poolToUse[this.messageIndex % poolToUse.length];
    this.messageIndex++;
    this.lastMessageSent = selected;

    return selected;
  }

  /**
   * Envia a mensagem de lembrete para o grupo configurado ou especificado
   */
  async sendWaterReminder(customTarget?: string): Promise<{ success: boolean; message: string; target: string; period?: DayPeriod }> {
    const target = customTarget || this.configService.get<string>('WATER_TARGET_GROUP_JID', '');

    if (!target) {
      const msg = 'Nenhum grupo de destino configurado! Defina WATER_TARGET_GROUP_JID no .env ou envie o parâmetro customTarget.';
      this.logger.warn(msg);
      return { success: false, message: msg, target: '' };
    }

    const textToSend = this.getNextMessage();
    const period = this.getCurrentPeriod();

    this.logger.log(`Enviando lembrete de água (${period}) para ${target}...`);
    await this.evolutionService.sendTextMessage(target, textToSend);

    this.totalSent++;
    this.lastSentAt = new Date();

    this.logger.log(`Lembrete de água enviado com sucesso para ${target}! Total enviados hoje: ${this.totalSent}`);

    return {
      success: true,
      message: textToSend,
      target,
      period,
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
      totalMessagesAvailable: this.getMessagesList().length,
    };
  }

  /**
   * Retorna a lista completa de todas as mensagens disponíveis (iniciando pelas originais)
   */
  getMessagesList(): string[] {
    return [
      ...this.originalMessages,
      ...this.morningMessages,
      ...this.afternoonMessages,
      ...this.eveningMessages,
      ...this.humorousMessages,
    ];
  }

  /**
   * Retorna as mensagens organizadas por categoria
   */
  getCategorizedMessages() {
    return {
      total: this.getMessagesList().length,
      currentPeriod: this.getCurrentPeriod(),
      categories: {
        originais: this.originalMessages,
        manha: this.morningMessages,
        tarde: this.afternoonMessages,
        noite: this.eveningMessages,
        humorEMemes: this.humorousMessages,
      },
    };
  }
}
