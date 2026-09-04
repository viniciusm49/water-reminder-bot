import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { EvolutionService } from '../evolution/evolution.service.js';

export interface ParticipantStatus {
  jid: string;
  name: string;
  confirmed: boolean;
  confirmedAt?: string;
}

export interface ActiveRound {
  id: string;
  groupJid: string;
  startedAt: string;
  step: 'initial' | 'followup_sent' | 'finished';
  status: 'active' | 'all_confirmed' | 'expired';
  participants: Record<string, ParticipantStatus>;
  timerFollowup?: any;
  timerGiveUp?: any;
}

export interface ReminderStats {
  totalSent: number;
  lastSentAt: string | null;
  targetGroup: string;
  cronExpression: string;
  isEnabled: boolean;
  totalMessagesAvailable: number;
  activeRound?: {
    id: string;
    startedAt: string;
    step: string;
    status: string;
    totalParticipants: number;
    confirmedCount: number;
    pendingCount: number;
  } | null;
}

export type DayPeriod = 'morning' | 'afternoon' | 'evening';

@Injectable()
export class WaterReminderService implements OnModuleInit {
  private readonly logger = new Logger(WaterReminderService.name);
  private totalSent = 0;
  private lastSentAt: Date | null = null;
  private lastMessageSent = '';
  private messageIndex = 0;
  private praiseIndex = 0;
  private followupIndex = 0;

  // Cache de JIDs conhecidos do próprio bot (LIDs, telefones limpos, etc.)
  private readonly knownBotJids: Set<string> = new Set();

  // Estado da rodada de acompanhamento ativa
  private activeRound: ActiveRound | null = null;

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

  // 6. Mensagens de Elogio e Parabéns ao Mandar o "OK"
  private readonly praiseMessages: string[] = [
    '🎉 *Aí sim, {name}!* Mais um copo de água pra conta! Rins filtrando com 100% de eficiência e mente afiada. Parabéns pela disciplina! 💧👏',
    '🏆 *Mandou bem demais, {name}!* OK confirmado com sucesso! Seu corpo, pele e cérebro agradecem pelo combustível sagrado. Continue assim! 🥤✨',
    '👏 *Boa, {name}!* Registrado! Enquanto alguns viram cacto, você tá aí hidratado e com a saúde blindada. Tamo junto! 🌊💪',
    '⭐ *Sensacional, {name}!* O seu rim acabou de soltar fogos de artifício em comemoração! Orgulho da patrulha da água! 🥳🚰',
    '🥇 *Ponto pra você, {name}!* Confirmação anotada! Quem bebe água vence na vida e tem o dobro de foco. Saúde! 🥂💦',
    '💪 *É disso que eu tô falando, {name}!* Hidratação garantida. Parabéns pela agilidade e pelo foco! 🚀💧',
    '🧊 *Show de bola, {name}!* Presença confirmada no time dos bem hidratados. Segue o jogo com energia total! ⚡🥛',
  ];

  // 7. Mensagens de Cobrança Única da Água (1 hora após o alerta)
  private readonly followupMessages: string[] = [
    '👀 *COBRANÇA DA ÁGUA (1 HORA):* ⏰💧\n\nOi {names}, vi que você ainda não confirmou que bebeu água! Já faz 1 hora do alerta. Já tomou seu copo ou a correria fez esquecer? Mande um *ok* aqui no grupo pra confirmar! 🚰🧐',
    '📢 *LEMBRETE DE HIDRATAÇÃO:* 🚨⏰\n\n{names}, já faz 1 hora da notificação e nada do seu *ok*! Não me deixa na mão nem faça o rim sofrer. Vai lá beber água agora e manda o *ok* pra confirmar! 💧🙏',
    '🌵 *ALERTA DE DESERTO:* 🌵\n\n{names}, nada de se transformar em cacto! Já passou 1 hora do alerta: levantem agora, tomem 1 copão d\'água e respondam com um *ok* pra gente saber! 🥤👀',
    '⏳ *HORA DA CHECAGEM:* ⌛🚰\n\n{names}, 1 hora se passou e a sua garrafa de água continua cheia? Corre pro filtro, bebe aquele copo caprichado e manda um *ok*! 🏃‍♂️💨',
    '🪨 *AVISO DO DEPARTAMENTO DE UROLOGIA:* 🏥😅\n\n{names}, 1 hora sem confirmar a água! O departamento contra pedras nos rins está em alerta. Beba água agora e responda *ok* antes que eu desista de cobrar! 💦⚡',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly evolutionService: EvolutionService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    this.setupCronReminder();
    this.autoConfigureWebhook();
  }

  /**
   * Tenta registrar automaticamente o webhook na Evolution API
   */
  private async autoConfigureWebhook() {
    const webhookUrl = this.configService.get<string>(
      'EVOLUTION_WEBHOOK_URL',
      'http://bot:3333/evolution/webhook',
    );
    try {
      await this.evolutionService.configureWebhook(webhookUrl);
    } catch (e: any) {
      this.logger.debug(`Webhook auto-config ignorado ou adiado: ${e.message}`);
    }
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

    const tz = this.configService.get<string>('REMINDER_TIMEZONE', 'America/Sao_Paulo');

    try {
      const job = new CronJob(
        cronExpression,
        async () => {
          this.logger.log('Disparo do Cron de Lembrete de Água acionado.');
          try {
            await this.sendWaterReminder();
          } catch (err: any) {
            this.logger.error(`Erro ao disparar lembrete agendado: ${err.message}`);
          }
        },
        null,
        false,
        tz,
      );

      this.schedulerRegistry.addCronJob('water-reminder-cron', job);
      job.start();

      this.logger.log(`Cron de lembrete de água registrado com sucesso! Expressão: "${cronExpression}" [Fuso: ${tz}]`);
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
   * Intervalo de cobrança em minutos (padrão: 60 minutos / 1 hora)
   */
  getFollowupDelayMinutes(): number {
    const val = this.configService.get<string>('WATER_FOLLOWUP_DELAY_MINUTES', '60');
    const num = parseInt(val, 10);
    return isNaN(num) || num <= 0 ? 60 : num;
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
   * Seleciona a próxima mensagem levando em conta o período do dia e humor
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

    const eligiblePool = [
      ...periodPool,
      ...this.humorousMessages,
      ...this.originalMessages,
    ];

    const filteredPool = eligiblePool.filter((m) => m !== this.lastMessageSent);
    const poolToUse = filteredPool.length > 0 ? filteredPool : eligiblePool;

    const selected = poolToUse[this.messageIndex % poolToUse.length];
    this.messageIndex++;
    this.lastMessageSent = selected;

    return selected;
  }

  /**
   * Limpa timers da rodada anterior
   */
  private clearRoundTimers(round: ActiveRound | null) {
    if (!round) return;
    if (round.timerFollowup) clearTimeout(round.timerFollowup);
    if (round.timerGiveUp) clearTimeout(round.timerGiveUp);
  }

  /**
   * Inicia o ciclo de cobrança da água para o grupo
   */
  private async startCobrançaCycle(groupJid: string, roundId: string) {
    this.clearRoundTimers(this.activeRound);

    const participantsMap: Record<string, ParticipantStatus> = {};

    try {
      const participants = await this.evolutionService.getGroupParticipants(groupJid);

      for (const p of participants) {
        // Ignora identificadores vazios
        if (!p.id) continue;

        // Ignora o próprio número/JID do bot (por número limpo sem device, ou por nome configurado)
        const isBot = await this.isBotUser(p.id, p.name);
        if (isBot) {
          this.logger.log(`Número do próprio bot (${p.id} - ${p.name || 'Bot'}) excluído da lista de checagem.`);
          continue;
        }

        participantsMap[p.id] = {
          jid: p.id,
          name: p.name || '',
          confirmed: false,
        };
      }
    } catch (e: any) {
      this.logger.warn(`Não foi possível pré-carregar participantes para cobrança: ${e.message}`);
    }

    const delayMinutes = this.getFollowupDelayMinutes(); // padrão: 60 minutos (1 hora)
    const delayCobrança = delayMinutes * 60 * 1000;
    const delayGiveUp = delayCobrança + (30 * 60 * 1000); // 30 minutos após a cobrança (total 90 min)

    this.activeRound = {
      id: roundId,
      groupJid,
      startedAt: new Date().toISOString(),
      step: 'initial',
      status: 'active',
      participants: participantsMap,
    };

    // Cobrança Única (+60 min / 1 hora)
    this.activeRound.timerFollowup = setTimeout(() => {
      this.runFollowup(roundId);
    }, delayCobrança);

    // Desistência (+90 min no total)
    this.activeRound.timerGiveUp = setTimeout(() => {
      this.runGiveUp(roundId);
    }, delayGiveUp);

    this.logger.log(`Rodada de acompanhamento #${roundId} iniciada para ${groupJid}. Cobrança única agendada para daqui a ${delayMinutes} min.`);
  }

  /**
   * Envia o lembrete principal e inicia a rodada de espera pelo OK
   */
  async sendWaterReminder(customTarget?: string): Promise<{ success: boolean; message: string; target: string; period?: DayPeriod; roundId?: string }> {
    const target = customTarget || this.configService.get<string>('WATER_TARGET_GROUP_JID', '');

    if (!target) {
      const msg = 'Nenhum grupo de destino configurado! Defina WATER_TARGET_GROUP_JID no .env ou envie o parâmetro customTarget.';
      this.logger.warn(msg);
      return { success: false, message: msg, target: '' };
    }

    const textToSend = this.getNextMessage();
    const period = this.getCurrentPeriod();
    const roundId = Date.now().toString();

    try {
      this.logger.log(`Enviando lembrete de água (${period}) para ${target}...`);
      const sendResult = await this.evolutionService.sendTextMessage(target, textToSend);

      // Captura o JID retornado pelo envio para registrar o bot instantaneamente
      if (sendResult?.key?.participant) this.registerBotJid(sendResult.key.participant);
      if (sendResult?.key?.participantAlt) this.registerBotJid(sendResult.key.participantAlt);

      this.totalSent++;
      this.lastSentAt = new Date();

      // Inicia a rodada de checagem do OK
      await this.startCobrançaCycle(target, roundId);

      this.logger.log(`Lembrete de água enviado com sucesso para ${target}! Total enviados: ${this.totalSent}`);

      return {
        success: true,
        message: textToSend,
        target,
        period,
        roundId,
      };
    } catch (err: any) {
      this.logger.error(`Falha ao enviar lembrete: ${err.message}`);
      return {
        success: false,
        message: `Falha no envio da mensagem. Verifique se o WhatsApp está conectado no status 'open'. Erro: ${err.message}`,
        target,
        period,
      };
    }
  }

  /**
   * Registra um JID/LID/número confirmado como pertencente ao bot
   */
  registerBotJid(jid: string) {
    if (!jid) return;
    this.knownBotJids.add(jid);
    const clean = this.extractCleanPhone(jid);
    if (clean) this.knownBotJids.add(clean);
  }

  /**
   * Extrai apenas os dígitos do número de telefone de um JID,
   * removendo sufixo de dispositivo (:1, :12, etc.) e sufixo de domínio (@s.whatsapp.net)
   */
  extractCleanPhone(jid: string): string {
    if (!jid) return '';
    const userPart = jid.split('@')[0].split(':')[0];
    return userPart.replace(/\D/g, '');
  }

  /**
   * Verifica se o participante ou mensagem pertence ao próprio bot
   */
  async isBotUser(jid: string, name?: string): Promise<boolean> {
    if (!jid) return false;

    // 0. Verifica cache de JIDs/LIDs conhecidos do bot
    if (this.knownBotJids.has(jid)) return true;
    const cleanUser = this.extractCleanPhone(jid);
    if (cleanUser && this.knownBotJids.has(cleanUser)) return true;

    // 1. Compara com botJid obtido dinamicamente da Evolution API
    const botJid = await this.evolutionService.getBotJid();
    if (botJid) {
      this.registerBotJid(botJid);
      const cleanBot = this.extractCleanPhone(botJid);
      if (cleanBot && cleanUser && cleanBot === cleanUser) {
        return true;
      }
    }

    // 2. Compara com BOT_PHONE_NUMBER configurado no .env
    const configuredPhone = this.configService.get<string>('BOT_PHONE_NUMBER', '');
    if (configuredPhone) {
      const cleanConfigured = this.extractCleanPhone(configuredPhone);
      if (cleanUser && cleanConfigured && cleanUser === cleanConfigured) {
        this.registerBotJid(jid);
        return true;
      }
    }

    // 3. Compara com BOT_NAME configurado no .env
    const configuredBotName = this.configService.get<string>('BOT_NAME', '').toLowerCase().trim();
    if (configuredBotName) {
      if (name && name.toLowerCase().includes(configuredBotName)) {
        this.registerBotJid(jid);
        return true;
      }
      if (jid.toLowerCase().includes(configuredBotName)) {
        this.registerBotJid(jid);
        return true;
      }
    }

    return false;
  }

  /**
   * Verifica se um texto recebido contém confirmação real ("ok", "bebi", etc.),
   * ignorando risadas, memes e negações.
   */
  isOkConfirmation(text: string): boolean {
    if (!text) return false;

    const raw = text.trim();

    // 1. Rejeição imediata se contiver emojis de riso (com flag /u obrigatória para unicode surrogate pairs)
    if (/[😂🤣😆😅😹]/u.test(raw)) {
      return false;
    }

    const normalized = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .trim();

    // 2. Rejeição de risadas em texto (kkk, kakaka, hahaha, rsrsrs, jajaja, engraçado, etc.)
    const laughterRegex = /(\bk{2,}\b|\b(k+a+){2,}k*\b|\b(h+[aeiou]+){2,}\b|\b(r+s+){2,}r*\b|\b(j+a+){2,}j*\b|\bengracad[oa]\b)/i;
    if (laughterRegex.test(normalized)) {
      return false;
    }

    // 3. Rejeição de negações (ex: "n dei ok", "não bebi", "ainda nao", etc.)
    const negationRegex = /(^|\b)(nao|n|nem|ainda\s+nao|nunca|nao\s+dei|n\s+dei|nao\s+bebi|n\s+bebi|nao\s+tomei|n\s+tomei)\b/i;
    if (negationRegex.test(normalized)) {
      return false;
    }

    // 4. Confirmação positiva por palavras-chave
    const okRegex = /\b(o+k+|o+k+a+y+|o+k+e+y+|blz|beleza|bebi|tomei|feito|pronto|hidratad[oa]|fechou|confirmad[oa]|partiu)\b/i;

    // 5. Confirmação por emojis específicos (OBRIGATÓRIO usar flag /u)
    const emojiRegex = /[👍✅💧🥤🚰👌]/u;

    return okRegex.test(normalized) || emojiRegex.test(raw);
  }

  /**
   * Processa mensagem recebida via Webhook
   */
  async handleIncomingMessage(payload: any): Promise<boolean> {
    const event = (payload?.event || payload?.type || '').toLowerCase();
    if (!event.includes('messages.upsert') && !event.includes('messages_upsert')) {
      return false;
    }

    const data = payload?.data || payload;
    const key = data?.key;
    if (!key) return false;

    // Se a mensagem foi enviada pelo próprio bot (fromMe), registra os identificadores e encerra
    if (key.fromMe) {
      if (key.participant) this.registerBotJid(key.participant);
      if (key.participantAlt) this.registerBotJid(key.participantAlt);
      if (key.remoteJid && !key.remoteJid.includes('@g.us')) this.registerBotJid(key.remoteJid);
      return false;
    }

    const remoteJid: string = key.remoteJid || '';
    const participantJid: string = key.participant || remoteJid;
    const pushName: string = data.pushName || '';

    const text =
      data.message?.conversation ||
      data.message?.extendedTextMessage?.text ||
      data.message?.imageMessage?.caption ||
      '';

    const targetGroup = this.configService.get<string>('WATER_TARGET_GROUP_JID', '');
    if (targetGroup && remoteJid !== targetGroup) {
      return false;
    }

    // Ignora mensagens vindas do próprio bot (por número ou nome configurado)
    const isBot = await this.isBotUser(participantJid, pushName);
    if (isBot) {
      return false;
    }

    if (this.isOkConfirmation(text)) {
      this.logger.log(`Confirmação de água ("${text.trim()}") detectada de ${pushName || participantJid}`);
      await this.registerParticipantOk(remoteJid, participantJid, pushName);
      return true;
    }

    return false;
  }

  /**
   * Registra o OK do participante e envia mensagem de parabéns
   */
  async registerParticipantOk(groupJid: string, participantJid: string, pushName?: string) {
    if (!this.activeRound || this.activeRound.status !== 'active') {
      this.logger.debug('Mensagem de OK recebida fora de uma rodada de checagem ativa.');
      return;
    }

    // Se for o próprio bot, ignora
    const isBot = await this.isBotUser(participantJid, pushName);
    if (isBot) {
      return;
    }

    // Busca o participante correspondente no mapa (usando número limpo sem device)
    const cleanParticipant = this.extractCleanPhone(participantJid);
    let existingKey = Object.keys(this.activeRound.participants).find(
      (k) => k === participantJid || this.extractCleanPhone(k) === cleanParticipant,
    );

    if (!existingKey) {
      existingKey = participantJid;
      this.activeRound.participants[existingKey] = {
        jid: participantJid,
        name: pushName || '',
        confirmed: false,
      };
    }

    const participant = this.activeRound.participants[existingKey];

    // Se já havia confirmado nesta rodada, evita enviar duplo parabéns
    if (participant.confirmed) {
      return;
    }

    // Marca como confirmado
    participant.confirmed = true;
    participant.confirmedAt = new Date().toISOString();
    if (pushName) participant.name = pushName;

    // Seleciona mensagem de parabéns
    const template = this.praiseMessages[this.praiseIndex % this.praiseMessages.length];
    this.praiseIndex++;

    const displayName = pushName || `@${participantJid.split('@')[0]}`;
    const praiseText = template.replace(/{name}/g, displayName);

    this.logger.log(`Enviando parabéns para ${displayName} no grupo ${groupJid}...`);

    try {
      await this.evolutionService.sendTextMessage(groupJid, praiseText, [participantJid]);
    } catch (err: any) {
      this.logger.error(`Erro ao enviar parabéns: ${err.message}`);
    }

    // Verifica se todos os participantes já confirmaram
    const participantsList = Object.values(this.activeRound.participants);
    const unconfirmed = participantsList.filter((p) => !p.confirmed);

    if (participantsList.length > 0 && unconfirmed.length === 0) {
      this.logger.log(`🎉 Todos os participantes confirmaram a água na rodada #${this.activeRound.id}! Finalizando cobranças.`);
      this.clearRoundTimers(this.activeRound);
      this.activeRound.status = 'all_confirmed';
      this.activeRound.step = 'finished';

      try {
        await this.evolutionService.sendTextMessage(
          groupJid,
          '🏆 *META BATIDA 100%!* Todo mundo do grupo já confirmou a hidratação dessa rodada! Orgulho desse time, continuem assim! 💧🥳✨',
        );
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Executa a cobrança única da água (1 hora após o alerta)
   */
  async runFollowup(roundId: string) {
    if (!this.activeRound || this.activeRound.id !== roundId || this.activeRound.status !== 'active') {
      return;
    }

    // Filtra participantes pendentes garantindo exclusão do bot
    const unconfirmed: ParticipantStatus[] = [];
    for (const p of Object.values(this.activeRound.participants)) {
      if (!p.confirmed) {
        const isBot = await this.isBotUser(p.jid, p.name);
        if (!isBot) {
          unconfirmed.push(p);
        } else {
          this.logger.log(`Excluindo bot identificado antes da cobrança: ${p.jid}`);
        }
      }
    }

    if (unconfirmed.length === 0) {
      this.logger.log(`Cobrança de 1 hora (#${roundId}): Todos já confirmaram. Nenhuma cobrança necessária.`);
      return;
    }

    this.activeRound.step = 'followup_sent';

    const mentions = unconfirmed.map((u) => u.jid);
    const namesStr = unconfirmed.map((u) => (u.name ? `@${u.name}` : `@${u.jid.split('@')[0]}`)).join(', ');

    const template = this.followupMessages[this.followupIndex % this.followupMessages.length];
    this.followupIndex++;

    const textToSend = template.replace(/{names}/g, namesStr);

    this.logger.log(`Disparando Cobrança Única de 1 hora para ${unconfirmed.length} participantes pendentes em ${this.activeRound.groupJid}...`);

    try {
      await this.evolutionService.sendTextMessage(this.activeRound.groupJid, textToSend, mentions);
    } catch (err: any) {
      this.logger.error(`Erro ao disparar Cobrança de 1 hora: ${err.message}`);
    }
  }

  /**
   * Encerra a rodada por tempo limite (90 minutos) sem novas cobranças
   */
  runGiveUp(roundId: string) {
    if (!this.activeRound || this.activeRound.id !== roundId || this.activeRound.status !== 'active') {
      return;
    }

    this.logger.log(`Rodada #${roundId} expirou após tempo limite (90 min). Encerrando cobranças desta rodada.`);
    this.clearRoundTimers(this.activeRound);
    this.activeRound.status = 'expired';
    this.activeRound.step = 'finished';
  }

  /**
   * Retorna dados da rodada atual
   */
  getActiveRoundDetails() {
    if (!this.activeRound) {
      return {
        hasActiveRound: false,
        message: 'Nenhuma rodada de checagem ativa no momento.',
      };
    }

    const participants = Object.values(this.activeRound.participants);
    const confirmed = participants.filter((p) => p.confirmed);
    const pending = participants.filter((p) => !p.confirmed);

    return {
      hasActiveRound: true,
      roundId: this.activeRound.id,
      startedAt: this.activeRound.startedAt,
      step: this.activeRound.step,
      status: this.activeRound.status,
      groupJid: this.activeRound.groupJid,
      totalParticipants: participants.length,
      confirmedCount: confirmed.length,
      pendingCount: pending.length,
      confirmedList: confirmed.map((c) => ({ jid: c.jid, name: c.name, at: c.confirmedAt })),
      pendingList: pending.map((p) => ({ jid: p.jid, name: p.name })),
    };
  }

  /**
   * Força a execução manual da cobrança para testes imediatos
   */
  async triggerManualFollowup(step: '1' | '2' = '1') {
    if (!this.activeRound) {
      return { success: false, message: 'Nenhuma rodada ativa para cobrar.' };
    }
    await this.runFollowup(this.activeRound.id);
    return { success: true, message: 'Cobrança de 1 hora disparada manualmente.', step };
  }

  /**
   * Retorna estatísticas e configurações atuais do lembrete
   */
  getStats(): ReminderStats {
    const roundDetails = this.getActiveRoundDetails();
    return {
      totalSent: this.totalSent,
      lastSentAt: this.lastSentAt ? this.lastSentAt.toISOString() : null,
      targetGroup: this.configService.get<string>('WATER_TARGET_GROUP_JID', 'Não configurado'),
      cronExpression: this.configService.get<string>('WATER_REMINDER_CRON', '0 8-20/1 * * *'),
      isEnabled: this.configService.get<string>('WATER_REMINDER_ENABLED', 'true') === 'true',
      totalMessagesAvailable: this.getMessagesList().length,
      activeRound: roundDetails.hasActiveRound
        ? {
            id: roundDetails.roundId!,
            startedAt: roundDetails.startedAt!,
            step: roundDetails.step!,
            status: roundDetails.status!,
            totalParticipants: roundDetails.totalParticipants!,
            confirmedCount: roundDetails.confirmedCount!,
            pendingCount: roundDetails.pendingCount!,
          }
        : null,
    };
  }

  /**
   * Retorna a lista completa de todas as mensagens disponíveis
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
   * Retorna as mensagens organizadas por categoria incluindo elogios e cobranças
   */
  getCategorizedMessages() {
    return {
      total: this.getMessagesList().length + this.praiseMessages.length + this.followupMessages.length,
      currentPeriod: this.getCurrentPeriod(),
      categories: {
        originais: this.originalMessages,
        manha: this.morningMessages,
        tarde: this.afternoonMessages,
        noite: this.eveningMessages,
        humorEMemes: this.humorousMessages,
        elogiosEParabensOK: this.praiseMessages,
        cobrancaUmaHora: this.followupMessages,
      },
    };
  }
}
