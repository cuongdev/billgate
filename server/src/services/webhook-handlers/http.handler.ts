import fetch from 'node-fetch';
import { WebhookConfig } from '../webhook.service';
import { WebhookHandler, WebhookResult } from './webhook-handler.interface';
import { AuthStrategyFactory } from '../webhook-auth.factory';

export class HttpWebhookHandler implements WebhookHandler {
    async handle(payload: any, config: WebhookConfig): Promise<WebhookResult> {
        let statusCode = 0;
        let responseBody = '';
        const requestBody = JSON.stringify(payload);

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            const authStrategy = AuthStrategyFactory.getStrategy(config.authType);
            authStrategy.apply(headers, config);

            if (config.config?.headers) {
               Object.assign(headers, config.config.headers);
            }

            const res = await fetch(config.url, {
                method: 'POST',
                headers,
                body: requestBody,
            });

            const text = await res.text();
            statusCode = res.status;
            responseBody = text.substring(0, 5000);
            
            return {
                statusCode,
                responseBody,
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
