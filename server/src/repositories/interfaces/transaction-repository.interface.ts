import { Transaction } from '../../models/transaction.model';
import { Transaction as SequelizeTransaction } from 'sequelize';

export interface ITransactionRepository {
  save(data: Partial<Transaction>, options?: { transaction?: SequelizeTransaction }): Promise<Transaction>;
  findById(id: string, options?: { transaction?: SequelizeTransaction }): Promise<Transaction | null>;
  findByBankId(bankId: string, options?: { transaction?: SequelizeTransaction }): Promise<Transaction | null>;
  find(filters: {
    sessionId?: string | string[];
    search?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    sort?: 'asc' | 'desc';
    sortBy?: string;
  }, options?: { transaction?: SequelizeTransaction }): Promise<{ data: Transaction[]; total: number }>;
  
  getStats(sessionId?: string | string[], startDate?: Date, endDate?: Date, options?: { transaction?: SequelizeTransaction }): Promise<any>;
}
