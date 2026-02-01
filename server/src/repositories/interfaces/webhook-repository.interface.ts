import { Webhook } from '../../models/webhook.model';
import { WebhookLog } from '../../models/webhook-log.model';
import { Transaction } from 'sequelize';

export interface IWebhookRepository {
  create(data: Partial<Webhook>, options?: { transaction?: Transaction }): Promise<Webhook>;
  findAll(sessionId?: string, options?: { transaction?: Transaction }): Promise<Webhook[]>;
  delete(filters: { id?: string; sessionId?: string } | string, options?: { transaction?: Transaction }): Promise<void>;
  deleteBySession(sessionId: string, options?: { transaction?: Transaction}): Promise<void>;
  logAttempt(data: Partial<WebhookLog>, options?: { transaction?: Transaction }): Promise<WebhookLog>;
  findLogs(filters: {
    webhookId?: string | string[];
    limit?: number;
    offset?: number;
  }, options?: { transaction?: Transaction }): Promise<{ data: WebhookLog[]; total: number }>;
  findAllByUserId(userId: string, options?: { transaction?: Transaction }): Promise<Webhook[]>;
  findById(id: string, options?: { transaction?: Transaction }): Promise<Webhook | null>;
  update(data: Partial<Webhook>, options: { where: any; transaction?: Transaction }): Promise<void>;
}
