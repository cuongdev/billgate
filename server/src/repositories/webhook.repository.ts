import { Webhook } from '../models/webhook.model';
import { Session } from '../models/session.model';
import { WebhookLog } from '../models/webhook-log.model';
import { IWebhookRepository } from './interfaces/webhook-repository.interface';
import { Transaction, Op } from 'sequelize';

export class WebhookRepository implements IWebhookRepository {
  async create(data: Partial<Webhook>, options?: { transaction?: Transaction }): Promise<Webhook> {
    return await Webhook.create(data, { transaction: options?.transaction });
  }

  async findAll(sessionId?: string, options?: { transaction?: Transaction }): Promise<Webhook[]> {
    const where: any = {};
    if (sessionId) where.sessionId = sessionId;
    return await Webhook.findAll({ where, transaction: options?.transaction });
  }

  async findById(id: string, options?: { transaction?: Transaction }): Promise<Webhook | null> {
    return await Webhook.findByPk(id, { transaction: options?.transaction });
  }

  async update(data: Partial<Webhook>, options: { where: any, transaction?: Transaction }): Promise<void> {
    await Webhook.update(data, { where: options.where, transaction: options?.transaction });
  }

  async delete(filters: { id?: string; sessionId?: string } | string, options?: { transaction?: Transaction }): Promise<void> {
    // Support backward compatibility: if filters is a string, treat it as ID
    const where: any = {};
    if (typeof filters === 'string') {
      where.id = filters;
    } else {
      if (filters.id) {
        where.id = filters.id;
      }
      if (filters.sessionId) {
        where.sessionId = filters.sessionId;
      }
    }

    // Soft delete by setting deletedAt
    await Webhook.update(
      { deletedAt: new Date() },
      { where, transaction: options?.transaction }
    );
  }

  async deleteBySession(sessionId: string, options?: { transaction?: Transaction }): Promise<void> {
    await this.delete({ sessionId }, options);
  }

  async logAttempt(data: Partial<WebhookLog>, options?: { transaction?: Transaction }): Promise<WebhookLog> {
    return await WebhookLog.create(data, { transaction: options?.transaction });
  }

  async findAllByUserId(userId: string, options?: { transaction?: Transaction }): Promise<Webhook[]> {
    return await Webhook.findAll({
      include: [{
        model: Session,
        as: 'session',
        where: { userId },
        required: true
      }],
      transaction: options?.transaction
    });
  }

  async findLogs(filters: { webhookId?: string | string[]; limit?: number; offset?: number }, options?: { transaction?: Transaction }): Promise<{ data: WebhookLog[]; total: number }> {
    const where: any = {};
    if (filters.webhookId) {
      where.webhookId = Array.isArray(filters.webhookId)
        ? { [Op.in]: filters.webhookId }
        : filters.webhookId;
    }

    const { count, rows } = await WebhookLog.findAndCountAll({
      where,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      order: [['dispatchedAt', 'DESC']],
      include: [{ model: Webhook, as: 'webhook' }],
      transaction: options?.transaction
    });

    return { data: rows, total: count };
  }

  async deleteLogs(filters: { sessionId?: string }, options?: { transaction?: Transaction }): Promise<void> {
    const where: any = {};
    
    if (filters.sessionId) {
      const webhooks = await Webhook.findAll({
        where: { sessionId: filters.sessionId },
        attributes: ['id'],
        transaction: options?.transaction
      });
      
      const webhookIds = webhooks.map(w => w.id);
      if (webhookIds.length > 0) {
        await WebhookLog.destroy({
          where: { webhookId: webhookIds },
          transaction: options?.transaction
        });
      }
    }
  }

}
