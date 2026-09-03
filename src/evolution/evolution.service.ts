import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface GroupItem {
  id: string;
  subject: string;
  size?: number;
  creation?: number;
  owner?: string;
  desc?: string;
}

export interface ConnectionStatus {
  instance: string;
  state: 'open' | 'connecting' | 'close' | 'not_created' | 'error';
  raw?: any;
}

@Injectable()
export class EvolutionService implements OnModuleInit {
  private readonly logger = new Logger(EvolutionService.name);
  private readonly http: AxiosInstance;
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly instanceName: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('EVOLUTION_API_URL', 'http://localhost:8080').replace(/\/+$/, '');
    this.apiKey = this.configService.get<string>('EVOLUTION_API_KEY', 'B6D711FCDE4D4FD5936544120E713976');
    this.instanceName = this.configService.get<string>('EVOLUTION_INSTANCE_NAME', 'water-bot');

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
    } catch (err: any) {
      this.logger.warn(`Não foi possível verificar/criar a instância no startup: ${err.message}. Certifique-se de que a Evolution API está em execução.`);
    }
  }

  getInstanceName(): string {
    return this.instanceName;
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  /**
   * Garante que a instância exista na Evolution API
   */
  async ensureInstanceExists(): Promise<void> {
    try {
      const state = await this.getConnectionState();
      if (state.state !== 'not_created') {
        this.logger.log(`Instância "${this.instanceName}" já existe com status: ${state.state}`);
        return;
      }
    } catch (e) {
      // continua para tentar criar
    }

    try {
      this.logger.log(`Criando instância "${this.instanceName}" na Evolution API...`);
      await this.http.post('/instance/create', {
        instanceName: this.instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      });
      this.logger.log(`Instância "${this.instanceName}" criada com sucesso.`);
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.data?.response?.message?.includes('already in use')) {
        this.logger.log(`Instância "${this.instanceName}" já estava criada.`);
      } else {
        throw new Error(`Erro ao criar instância: ${err.response?.data?.message || err.message}`);
      }
    }
  }

  /**
   * Obtém o status da conexão da instância
   */
  async getConnectionState(): Promise<ConnectionStatus> {
    try {
      const res = await this.http.get(`/instance/connectionState/${this.instanceName}`);
      const state = res.data?.instance?.state || res.data?.state || 'close';
      return {
        instance: this.instanceName,
        state,
        raw: res.data,
      };
    } catch (err: any) {
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

  /**
   * Obtém o QR Code para conexão do WhatsApp
   */
  async getConnectQrCode(): Promise<{ base64?: string; code?: string; pairingCode?: string; state?: string; raw?: any }> {
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
    } catch (err: any) {
      throw new Error(`Erro ao buscar QR Code da Evolution API: ${err.response?.data?.message || err.message}`);
    }
  }

  /**
   * Envia uma mensagem de texto para um número ou ID de grupo (ex: 120363xxx@g.us)
   */
  async sendTextMessage(number: string, text: string): Promise<any> {
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
    } catch (err: any) {
      this.logger.error(`Falha ao enviar mensagem para ${number}: ${err.response?.data?.message || err.message}`);
      throw new Error(`Falha no envio da mensagem: ${JSON.stringify(err.response?.data || err.message)}`);
    }
  }

  /**
   * Busca todos os grupos em que o bot está participando
   */
  async fetchAllGroups(): Promise<GroupItem[]> {
    try {
      const res = await this.http.get(`/group/fetchAllGroups/${this.instanceName}?getParticipants=false`);
      const groupsData = Array.isArray(res.data) ? res.data : res.data?.groups || [];

      return groupsData.map((g: any) => ({
        id: g.id || g.jid,
        subject: g.subject || g.name || 'Sem Nome',
        size: g.size || g.participants?.length || 0,
        creation: g.creation,
        owner: g.owner,
        desc: g.desc,
      }));
    } catch (err: any) {
      this.logger.error(`Erro ao buscar grupos da instância: ${err.response?.data?.message || err.message}`);
      throw new Error(`Não foi possível listar os grupos. Verifique se o WhatsApp está conectado. Detalhe: ${err.response?.data?.message || err.message}`);
    }
  }
}
