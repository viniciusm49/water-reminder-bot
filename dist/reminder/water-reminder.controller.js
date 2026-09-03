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
import { Body, Controller, Get, Post } from '@nestjs/common';
import { WaterReminderService } from './water-reminder.service.js';
let WaterReminderController = class WaterReminderController {
    waterReminderService;
    constructor(waterReminderService) {
        this.waterReminderService = waterReminderService;
    }
    async triggerReminder(body = {}) {
        const result = await this.waterReminderService.sendWaterReminder(body?.target);
        return result;
    }
    getStatus() {
        return {
            success: true,
            data: this.waterReminderService.getStats(),
        };
    }
    getPreview() {
        return {
            success: true,
            messages: this.waterReminderService.getMessagesList(),
        };
    }
};
__decorate([
    Post('trigger'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WaterReminderController.prototype, "triggerReminder", null);
__decorate([
    Get('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WaterReminderController.prototype, "getStatus", null);
__decorate([
    Get('preview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WaterReminderController.prototype, "getPreview", null);
WaterReminderController = __decorate([
    Controller('reminder'),
    __metadata("design:paramtypes", [WaterReminderService])
], WaterReminderController);
export { WaterReminderController };
//# sourceMappingURL=water-reminder.controller.js.map