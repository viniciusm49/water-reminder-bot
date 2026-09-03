var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EvolutionService_1;
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
let EvolutionService = EvolutionService_1 = class EvolutionService {
    configService;
    logger = new Logger(EvolutionService_1.name);
    http;
    apiUrl;
    apiKey;
    instanceName;
    constructor(configService) {
        this.configService = configService;
        this.apiUrl = this.configService.get('EVOLUTION_API_URL', 'http://localhost:8080').replace(/\/+$/, '');
        this.apiKey = this.configService.get('EVOLUTION_API_KEY', 'B6D711FCDE4D4FD5936544120E713976');
        this.instanceName = this.configService.get('EVOLUTION_INSTANCE_NAME', 'water-bot');
        this.http = axios.create({
            baseURL: this.apiUrl,
            headers: {
                apikey: this.apiKey,
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        });
    }
    async onModuleInit() {
        this.logger.log(`Evolution API configurada para: ${this.apiUrl} (Instância: ${this.instanceName})`);
        try {
            await this.ensureInstanceExists();
        }
        catch (err) {
            this.logger.warn(`Não foi possível verificar/criar a instância no startup: ${err.message}. Certifique-se de que a Evolution API está em execução.`);
        }
    }
    getInstanceName() {
        return this.instanceName;
    }
    getApiUrl() {
        return this.apiUrl;
    }
    async ensureInstanceExists() {
        try {
            const state = await this.getConnectionState();
            if (state.state !== 'not_created') {
                this.logger.log(`Instância "${this.instanceName}" já existe com status: ${state.state}`);
                return;
            }
        }
        catch (e) {
        }
        try {
            this.logger.log(`Criando instância "${this.instanceName}" na Evolution API...`);
            await this.http.post('/instance/create', {
                instanceName: this.instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS',
            });
            this.logger.log(`Instância "${this.instanceName}" criada com sucesso.`);
        }
        catch (err) {
            if (err.response?.status === 403 || err.response?.data?.response?.message?.includes('already in use')) {
                this.logger.log(`Instância "${this.instanceName}" já estava criada.`);
            }
            else {
                throw new Error(`Erro ao criar instância: ${err.response?.data?.message || err.message}`);
            }
        }
    }
    async getConnectionState() {
        try {
            const res = await this.http.get(`/instance/connectionState/${this.instanceName}`);
            const state = res.data?.instance?.state || res.data?.state || 'close';
            return {
                instance: this.instanceName,
                state,
                raw: res.data,
            };
        }
        catch (err) {
            if (err.response?.status === 404) {
                return {
                    instance: this.instanceName,
                    state: 'not_created',
                };
            }
            return {
                instance: this.instanceName,
                state: 'error',
                raw: err.response?.data || err.message,
            };
        }
    }
    async getConnectQrCode() {
        await this.ensureInstanceExists();
        const currentState = await this.getConnectionState();
        if (currentState.state === 'open') {
            return {
                state: 'open',
            };
        }
        try {
            const res = await this.http.get(`/instance/connect/${this.instanceName}`);
            return {
                base64: res.data?.base64 || res.data?.qrcode?.base64,
                code: res.data?.code || res.data?.qrcode?.code,
                pairingCode: res.data?.pairingCode,
                state: currentState.state,
                raw: res.data,
            };
        }
        catch (err) {
            throw new Error(`Erro ao buscar QR Code da Evolution API: ${err.response?.data?.message || err.message}`);
        }
    }
    async sendTextMessage(number, text) {
        if (!number) {
            throw new Error('Número ou Group JID de destino não fornecido.');
        }
        try {
            const res = await this.http.post(`/message/sendText/${this.instanceName}`, {
                number,
                text,
                options: {
                    delay: 1200,
                    presence: 'composing',
                },
            });
            return res.data;
        }
        catch (err) {
            this.logger.error(`Falha ao enviar mensagem para ${number}: ${err.response?.data?.message || err.message}`);
            throw new Error(`Falha no envio da mensagem: ${JSON.stringify(err.response?.data || err.message)}`);
        }
    }
    async fetchAllGroups() {
        try {
            const res = await this.http.get(`/group/fetchAllGroups/${this.instanceName}?getParticipants=false`);
            const groupsData = Array.isArray(res.data) ? res.data : res.data?.groups || [];
            return groupsData.map((g) => ({
                id: g.id || g.jid,
                subject: g.subject || g.name || 'Sem Nome',
                size: g.size || g.participants?.length || 0,
                creation: g.creation,
                owner: g.owner,
                desc: g.desc,
            }));
        }
        catch (err) {
            this.logger.error(`Erro ao buscar grupos da instância: ${err.response?.data?.message || err.message}`);
            throw new Error(`Não foi possível listar os grupos. Verifique se o WhatsApp está conectado. Detalhe: ${err.response?.data?.message || err.message}`);
        }
    }
};
EvolutionService = EvolutionService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], EvolutionService);
export { EvolutionService };
//# sourceMappingURL=evolution.service.js.map