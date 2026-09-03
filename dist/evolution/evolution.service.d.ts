import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
export declare class EvolutionService implements OnModuleInit {
    private readonly configService;
    private readonly logger;
    private readonly http;
    private readonly apiUrl;
    private readonly apiKey;
    private readonly instanceName;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    getInstanceName(): string;
    getApiUrl(): string;
    ensureInstanceExists(): Promise<void>;
    getConnectionState(): Promise<ConnectionStatus>;
    getConnectQrCode(): Promise<{
        base64?: string;
        code?: string;
        pairingCode?: string;
        state?: string;
        raw?: any;
    }>;
    sendTextMessage(number: string, text: string): Promise<any>;
    fetchAllGroups(): Promise<GroupItem[]>;
}
