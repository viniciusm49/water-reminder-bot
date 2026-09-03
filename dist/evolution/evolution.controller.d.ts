import { EvolutionService } from './evolution.service.js';
export declare class EvolutionController {
    private readonly evolutionService;
    private readonly logger;
    constructor(evolutionService: EvolutionService);
    getStatus(): Promise<{
        success: boolean;
        instance: string;
        apiUrl: string;
        state: "open" | "connecting" | "close" | "not_created" | "error";
        raw: any;
    }>;
    renderQrCodePage(): Promise<string>;
    getQrCodeJson(): Promise<{
        base64?: string;
        code?: string;
        pairingCode?: string;
        state?: string;
        raw?: any;
    }>;
    getGroups(): Promise<{
        success: boolean;
        count: number;
        message: string;
        groups: {
            id: string;
            nome: string;
            membros: number | undefined;
        }[];
    }>;
    sendTestMessage(body: {
        to: string;
        text: string;
    }): Promise<{
        success: boolean;
        message: string;
        result?: undefined;
    } | {
        success: boolean;
        message: string;
        result: any;
    }>;
    handleWebhook(payload: any): Promise<{
        received: boolean;
    }>;
}
