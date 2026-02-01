import fetch from 'node-fetch';
import { WebhookConfig } from '../webhook.service';
import { WebhookHandler, WebhookResult } from './webhook-handler.interface';

export class TelegramWebhookHandler implements WebhookHandler {
    async handle(payload: any, config: WebhookConfig): Promise<WebhookResult> {
        const conf = config.config || {};
        const token = conf.botToken || conf.bot_token;
        const chatId = conf.chatId || conf.chat_id;

        if (!token || !chatId) {
            return {
                statusCode: 0,
                status: 'failed',
                responseBody: '',
                errorMessage: 'Missing Telegram bot token or chat ID',
                requestBody: ''
            };
        }

        const message = `
💰 <b>Giao dịch mới</b>
--------------
🗓 Ngày: ${payload.transactionDate}
💳 Tài khoản: ${payload.accountNumber}
💰 Số tiền: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payload.transferAmount)}
📝 Nội dung: ${payload.content}
--------------
        `.trim();

        const telegramBody = {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        };

        const requestBody = JSON.stringify(telegramBody);

        try {
            const url = `https://api.telegram.org/bot${token}/sendMessage`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: requestBody,
            });

            const text = await res.text();

            return {
                statusCode: res.status,
                responseBody: text.substring(0, 5000),
                status: res.ok ? 'success' : 'failed',
                requestBody
            };
        } catch (err: any) {
            return {
                statusCode: 0,
                responseBody: '',
                status: 'failed',
                errorMessage: err.message,
                requestBody
            };
        }
    }
}
