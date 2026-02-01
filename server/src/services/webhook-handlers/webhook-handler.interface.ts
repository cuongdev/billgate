import { WebhookConfig } from '../webhook.service';

export interface WebhookResult {
    statusCode: number;
    responseBody: string;
    status: 'success' | 'failed';
    errorMessage?: string;
    requestBody: string;
}

export interface WebhookHandler {
    handle(payload: any, config: WebhookConfig): Promise<WebhookResult>;
}
