var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var EvolutionController_1;
import { Body, Controller, Get, Header, Logger, Post } from '@nestjs/common';
import { EvolutionService } from './evolution.service.js';
let EvolutionController = EvolutionController_1 = class EvolutionController {
    evolutionService;
    logger = new Logger(EvolutionController_1.name);
    constructor(evolutionService) {
        this.evolutionService = evolutionService;
    }
    async getStatus() {
        const connection = await this.evolutionService.getConnectionState();
        return {
            success: true,
            instance: this.evolutionService.getInstanceName(),
            apiUrl: this.evolutionService.getApiUrl(),
            state: connection.state,
            raw: connection.raw,
        };
    }
    async renderQrCodePage() {
        try {
            const qrData = await this.evolutionService.getConnectQrCode();
            if (qrData.state === 'open') {
                return `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>WhatsApp Conectado - Water Reminder Bot</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0fdf4; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
              .card { background: white; padding: 2.5rem; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); max-width: 500px; text-align: center; }
              .badge { display: inline-block; background: #22c55e; color: white; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 0.9rem; margin-bottom: 1rem; }
              h1 { color: #15803d; margin: 0 0 1rem; font-size: 1.6rem; }
              p { color: #4b5563; line-height: 1.6; margin-bottom: 1.5rem; }
              .actions { display: flex; flex-direction: column; gap: 0.8rem; }
              a.button, button { display: block; padding: 0.8rem 1.2rem; background: #0284c7; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; transition: background 0.2s; }
              a.button:hover, button:hover { background: #0369a1; }
              a.button.secondary { background: #e2e8f0; color: #334155; }
              a.button.secondary:hover { background: #cbd5e1; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="badge">CONECTADO</div>
              <h1>✅ WhatsApp Conectado com Sucesso!</h1>
              <p>Sua instância <strong>${this.evolutionService.getInstanceName()}</strong> está ativa e pronta para enviar alertas de água.</p>
              <div class="actions">
                <a href="/evolution/groups" class="button">📋 Ver Meus Grupos (Pegar JID)</a>
                <button onclick="sendTestAlert()">💧 Disparar Lembrete de Teste Agora</button>
                <a href="/reminder/status" class="button secondary">⚙️ Ver Configurações do Agendador</a>
              </div>
            </div>
            <script>
              async function sendTestAlert() {
                try {
                  const res = await fetch('/reminder/trigger', { method: 'POST' });
                  const data = await res.json();
                  alert(data.message || 'Lembrete enviado!');
                } catch(e) {
                  alert('Erro ao enviar teste: ' + e.message);
                }
              }
            </script>
          </body>
          </html>
        `;
            }
            const qrCodeImg = qrData.base64
                ? `<img src="${qrData.base64}" alt="QR Code WhatsApp" style="width: 280px; height: 280px; margin: 1rem auto; display: block; border: 4px solid #e2e8f0; border-radius: 12px;" />`
                : `<div style="padding: 2rem; background: #fef3c7; color: #92400e; border-radius: 8px; margin: 1rem 0;">Aguardando geração do QR Code... Atualizando em instantes.</div>`;
            return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Conectar WhatsApp - Water Reminder Bot</title>
          <meta http-equiv="refresh" content="5">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { background: white; padding: 2.5rem; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); max-width: 480px; text-align: center; border: 1px solid #e2e8f0; }
            h1 { color: #0f172a; margin: 0 0 0.5rem; font-size: 1.5rem; }
            p { color: #64748b; line-height: 1.5; margin: 0 0 1.2rem; font-size: 0.95rem; }
            ol { text-align: left; color: #334155; font-size: 0.9rem; line-height: 1.6; margin: 1rem 0; padding-left: 1.4rem; }
            .timer { font-size: 0.8rem; color: #94a3b8; margin-top: 1rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>📱 Conectar WhatsApp</h1>
            <p>Escaneie o QR Code abaixo pelo aplicativo do WhatsApp no seu celular:</p>
            
            ${qrCodeImg}
            
            <ol>
              <li>Abra o WhatsApp no seu smartphone</li>
              <li>Acesse <strong>Aparelhos Conectados</strong></li>
              <li>Toque em <strong>Conectar um aparelho</strong> e aponte para a tela</li>
            </ol>
            
            <div class="timer">🔄 A página atualiza automaticamente a cada 5 segundos...</div>
          </div>
        </body>
        </html>
      `;
        }
        catch (err) {
            return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Erro - Evolution API</title>
          <style>
            body { font-family: sans-serif; background: #fff1f2; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 500px; }
            h2 { color: #e11d48; margin-top: 0; }
            pre { background: #f1f5f9; padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: 0.85rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>⚠️ Erro de Comunicação com a Evolution API</h2>
            <p>Não foi possível obter o QR Code. Verifique se o container ou serviço da Evolution API está rodando.</p>
            <pre>${err.message}</pre>
            <p><a href="/evolution/qrcode">Tentar novamente</a></p>
          </div>
        </body>
        </html>
      `;
        }
    }
    async getQrCodeJson() {
        return this.evolutionService.getConnectQrCode();
    }
    async getGroups() {
        const groups = await this.evolutionService.fetchAllGroups();
        return {
            success: true,
            count: groups.length,
            message: 'Copie o "id" do grupo desejado e adicione no arquivo .env na variável WATER_TARGET_GROUP_JID',
            groups: groups.map((g) => ({
                id: g.id,
                nome: g.subject,
                membros: g.size,
            })),
        };
    }
    async sendTestMessage(body) {
        if (!body.to || !body.text) {
            return {
                success: false,
                message: 'Os campos "to" e "text" são obrigatórios no corpo da requisição.',
            };
        }
        const result = await this.evolutionService.sendTextMessage(body.to, body.text);
        return {
            success: true,
            message: 'Mensagem enviada com sucesso.',
            result,
        };
    }
    async handleWebhook(payload) {
        this.logger.debug(`Webhook recebido da Evolution API: ${JSON.stringify(payload?.event || payload?.type || 'evento')}`);
        return { received: true };
    }
};
__decorate([
    Get('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EvolutionController.prototype, "getStatus", null);
__decorate([
    Get('qrcode'),
    Header('Content-Type', 'text/html; charset=utf-8'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EvolutionController.prototype, "renderQrCodePage", null);
__decorate([
    Get('qrcode/json'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EvolutionController.prototype, "getQrCodeJson", null);
__decorate([
    Get('groups'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EvolutionController.prototype, "getGroups", null);
__decorate([
    Post('send-test'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EvolutionController.prototype, "sendTestMessage", null);
__decorate([
    Post('webhook'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EvolutionController.prototype, "handleWebhook", null);
EvolutionController = EvolutionController_1 = __decorate([
    Controller('evolution'),
    __metadata("design:paramtypes", [EvolutionService])
], EvolutionController);
export { EvolutionController };
//# sourceMappingURL=evolution.controller.js.map