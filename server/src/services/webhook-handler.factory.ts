import { WebhookHandler } from './webhook-handlers/webhook-handler.interface';
import { HttpWebhookHandler } from './webhook-handlers/http.handler';
import { TelegramWebhookHandler } from './webhook-handlers/telegram.handler';

export class WebhookHandlerFactory {
    private static handlers: Record<string, WebhookHandler> = {
        'http': new HttpWebhookHandler(),
        'telegram': new TelegramWebhookHandler(),
    };

    static getHandler(type: string): WebhookHandler {
        return this.handlers[type] || this.handlers['http'];
    }
    
    static registerHandler(type: string, handler: WebhookHandler) {
        this.handlers[type] = handler;
    }
}
