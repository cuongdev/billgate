import { Transaction } from '../models/transaction.model';
import { Session } from '../models/session.model';
import { ITransactionRepository } from './interfaces/transaction-repository.interface';
import { Op, Transaction as SequelizeTransaction, Sequelize } from 'sequelize';

export class TransactionRepository implements ITransactionRepository {
  async save(data: Partial<Transaction>, options?: { transaction?: SequelizeTransaction }): Promise<Transaction> {
    if (data.bankTransactionId) {
        const existing = await this.findByBankId(data.bankTransactionId, options);
        if (existing) {
            return existing;
        }
    }
    
    return await Transaction.create(data, { transaction: options?.transaction });
  }

  async findById(id: string, options?: { transaction?: SequelizeTransaction }): Promise<Transaction | null> {
    return await Transaction.findByPk(id, { transaction: options?.transaction });
  }

  async findByBankId(bankId: string, options?: { transaction?: SequelizeTransaction }): Promise<Transaction | null> {
      return await Transaction.findOne({ where: { bankTransactionId: bankId }, transaction: options?.transaction });
  }

  async find(filters: {
    bankTransactionId?: string;
    sessionId?: string | string[];
    search?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    sort?: 'asc' | 'desc';
    sortBy?: string;
  }, options?: { transaction?: SequelizeTransaction }): Promise<{ data: Transaction[]; total: number }> {
    const where: any = {};

    if (filters.bankTransactionId) {
      where.bankTransactionId = filters.bankTransactionId;
    }

    if (filters.sessionId) {
      if (Array.isArray(filters.sessionId)) {
        where.sessionId = { [Op.in]: filters.sessionId };
      } else {
        where.sessionId = filters.sessionId;
      }
    }

    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      const escaped = term.replace(/%/g, '\\%').replace(/_/g, '\\_');
      where[Op.or] = [
        { note: { [Op.iLike]: `%${escaped}%` } },
        Sequelize.where(
          Sequelize.cast(Sequelize.col('amount_value'), 'VARCHAR'),
          { [Op.iLike]: `%${escaped}%` }
        ),
        Sequelize.where(
          Sequelize.cast(Sequelize.col('session.account_number'), 'VARCHAR'),
          { [Op.iLike]: `%${escaped}%` }
        ),
      ];
    }

    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};
      if (filters.startDate) where.transactionDate[Op.gte] = filters.startDate;
      if (filters.endDate) where.transactionDate[Op.lt] = filters.endDate; 
    }

    let orderItem = filters.sortBy || 'transactionDate';
    if (orderItem === 'date') orderItem = 'transactionDate';
    if (orderItem === 'amount') orderItem = 'amountValue';
    const orderDir = filters.sort || 'DESC';

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      limit: filters.limit || 20,
      offset: filters.offset || 0,
      order: [[orderItem, orderDir]],
      include: [{ model: Session, as: 'session', attributes: ['accountNumber', 'keyShare'] }],
      transaction: options?.transaction
    });

    return { data: rows, total: count };
  }

  async getStats(sessionId?: string | string[], startDate?: Date, endDate?: Date, options?: { transaction?: SequelizeTransaction }): Promise<any> {
    const where: any = {};
    if (sessionId) {
        if (Array.isArray(sessionId)) {
            where.sessionId = { [Op.in]: sessionId };
        } else {
            where.sessionId = sessionId;
        }
    }
    if (startDate) where.transactionDate = { [Op.gte]: startDate };
    if (endDate) {
        where.transactionDate = { ...where.transactionDate, [Op.lte]: endDate };
    }

    const totalVolume = await Transaction.sum('amountValue', { where, transaction: options?.transaction });
    const totalTransactions = await Transaction.count({ where, transaction: options?.transaction });
    
    return {
        totalVolume: totalVolume || 0,
        totalTransactions
    };
  }

  async delete(filters: { sessionId?: string }, options?: { transaction?: SequelizeTransaction }): Promise<void> {
    const where: any = {};
    if (filters.sessionId) {
      where.sessionId = filters.sessionId;
    }
    
    // Soft delete by setting deletedAt
    await Transaction.update(
      { deletedAt: new Date() },
      { where, transaction: options?.transaction }
    );
  }
}
