import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';
async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    logger.log('====================================================');
    logger.log(`💧 Water Reminder Bot rodando em: http://localhost:${port}`);
    logger.log(`📱 Conectar WhatsApp (QR Code):   http://localhost:${port}/evolution/qrcode`);
    logger.log(`📋 Listar Grupos (Pegar JID):      http://localhost:${port}/evolution/groups`);
    logger.log(`⚙️  Status do Agendador:           http://localhost:${port}/reminder/status`);
    logger.log('====================================================');
}
await bootstrap();
//# sourceMappingURL=main.js.map