var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WaterReminderService_1;
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { EvolutionService } from '../evolution/evolution.service.js';
let WaterReminderService = WaterReminderService_1 = class WaterReminderService {
    configService;
    evolutionService;
    schedulerRegistry;
    logger = new Logger(WaterReminderService_1.name);
    totalSent = 0;
    lastSentAt = null;
    messageIndex = 0;
    reminderMessages = [
        '💧 *HORA DE BEBER ÁGUA!* 💧\n\nSeu corpo e sua mente precisam de hidratação para funcionar no 100%! Levante, pegue um copão d\'água (250ml - 300ml) e beba agora! 🚰⚡',
        '🌊 *ALERTA DE HIDRATAÇÃO!* 🌊\n\nPausa rápida no trabalho: vá até a cozinha/filtro e tome água! Beber água regularmente melhora o foco, alivia o cansaço e previne dores de cabeça. 🧠✨',
        '🧊 *CHEGOU A NOTIFICAÇÃO DA SAÚDE!* 🧊\n\nMais um copo de água pra conta! Rins funcionando limpos, pele hidratada e energia renovada. Já bebeu o seu copo agora? 🥤💦',
        '🚰 *DROPS DE SAÚDE - HORA DA ÁGUA:* 🚰\n\nSabia que quando você sente sede seu corpo já começou a desidratar? Não espere a sede bater: encha a garrafa e tome alguns bons goles! 🏃‍♂️💨',
        '🔋 *RECARREGUE A BATERIA HÍDRICA:* 🔋\n\nMetade do seu cansaço diário pode ser simplesmente falta de água! Beba 1 copo d\'água gelada agora e sinta a diferença no seu dia. 💧🏆',
        '✨ *META DO DIA: BEM HIDRATADO!* ✨\n\nCada copo conta para sua meta diária de 2 a 3 litros. Bora beber água agora! 💦🥛',
    ];
    constructor(configService, evolutionService, schedulerRegistry) {
        this.configService = configService;
        this.evolutionService = evolutionService;
        this.schedulerRegistry = schedulerRegistry;
    }
    onModuleInit() {
        this.setupCronReminder();
    }
    setupCronReminder() {
        const isEnabled = this.configService.get('WATER_REMINDER_ENABLED', 'true') === 'true';
        const cronExpression = this.configService.get('WATER_REMINDER_CRON', '0 8-20/1 * * *');
        const targetGroup = this.configService.get('WATER_TARGET_GROUP_JID', '');
        if (!isEnabled) {
            this.logger.warn('Lembretes automáticos de água estão desativados (WATER_REMINDER_ENABLED=false).');
            return;
        }
        try {
            const job = new CronJob(cronExpression, async () => {
                this.logger.log('Disparo do Cron de Lembrete de Água acionado.');
                try {
                    await this.sendWaterReminder();
                }
                catch (err) {
                    this.logger.error(`Erro ao disparar lembrete agendado: ${err.message}`);
                }
            });
            this.schedulerRegistry.addCronJob('water-reminder-cron', job);
            job.start();
            this.logger.log(`Cron de lembrete de água registrado com sucesso! Expressão: "${cronExpression}"`);
            if (!targetGroup) {
                this.logger.warn('⚠️ ATENÇÃO: WATER_TARGET_GROUP_JID ainda não foi configurado no .env! Acesse http://localhost:3000/evolution/groups para encontrar o JID do seu grupo.');
            }
            else {
                this.logger.log(`Grupo de destino configurado: ${targetGroup}`);
            }
        }
        catch (err) {
            this.logger.error(`Erro ao registrar cron "${cronExpression}": ${err.message}`);
        }
    }
    async sendWaterReminder(customTarget) {
        const target = customTarget || this.configService.get('WATER_TARGET_GROUP_JID', '');
        if (!target) {
            const msg = 'Nenhum grupo de destino configurado! Defina WATER_TARGET_GROUP_JID no .env ou envie o parâmetro customTarget.';
            this.logger.warn(msg);
            return { success: false, message: msg, target: '' };
        }
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
    getStats() {
        return {
            totalSent: this.totalSent,
            lastSentAt: this.lastSentAt ? this.lastSentAt.toISOString() : null,
            targetGroup: this.configService.get('WATER_TARGET_GROUP_JID', 'Não configurado'),
            cronExpression: this.configService.get('WATER_REMINDER_CRON', '0 8-20/1 * * *'),
            isEnabled: this.configService.get('WATER_REMINDER_ENABLED', 'true') === 'true',
        };
    }
    getMessagesList() {
        return this.reminderMessages;
    }
};
WaterReminderService = WaterReminderService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService,
        EvolutionService,
        SchedulerRegistry])
], WaterReminderService);
export { WaterReminderService };
//# sourceMappingURL=water-reminder.service.js.map