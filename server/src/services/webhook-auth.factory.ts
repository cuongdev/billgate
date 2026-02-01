import { WebhookConfig } from './webhook.service';

export interface AuthStrategy {
    apply(headers: Record<string, string>, config: WebhookConfig): void;
}

export class NoAuthStrategy implements AuthStrategy {
    apply(headers: Record<string, string>, config: WebhookConfig): void {
        // No authentication headers needed
    }
}

export class HeaderAuthStrategy implements AuthStrategy {
    apply(headers: Record<string, string>, config: WebhookConfig): void {
        if (config.authHeader && config.authToken) {
            headers[config.authHeader] = config.authToken;
        }
    }
}

export class BearerAuthStrategy implements AuthStrategy {
    apply(headers: Record<string, string>, config: WebhookConfig): void {
        if (config.authToken) {
            headers['Authorization'] = `Bearer ${config.authToken}`;
        }
    }
}

export class BasicAuthStrategy implements AuthStrategy {
    apply(headers: Record<string, string>, config: WebhookConfig): void {
        if (config.authToken) {
            headers['Authorization'] = `Basic ${config.authToken}`;
        }
    }
}

export class AuthStrategyFactory {
    private static strategies: Record<string, AuthStrategy> = {
        'none': new NoAuthStrategy(),
        'header': new HeaderAuthStrategy(),
        'bearer': new BearerAuthStrategy(),
        'basic': new BasicAuthStrategy(),
    };

    static getStrategy(type: string): AuthStrategy {
        return this.strategies[type] || this.strategies['none'];
    }

    // Optional: Allow registering new strategies at runtime if needed
    static registerStrategy(type: string, strategy: AuthStrategy) {
        this.strategies[type] = strategy;
    }
}
