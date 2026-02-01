import { Session } from '../../models/session.model';
import { Transaction } from 'sequelize';

export interface RepositoryOptions {
  transaction?: Transaction;
  userId?: string;
  isSystem?: boolean;
}

export interface ISessionRepository {
  create(data: Partial<Session>, options?: RepositoryOptions): Promise<Session>;
  update(keyShare: string, data: Partial<Session>, options?: RepositoryOptions): Promise<number>;
  findByKeyShare(keyShare: string, options?: RepositoryOptions): Promise<Session | null>;
  findAll(options?: RepositoryOptions): Promise<Session[]>;
  delete(keyShare: string, options?: RepositoryOptions): Promise<void>;
  updateStatus(keyShare: string, status: 'active' | 'expired' | 'paused', options?: RepositoryOptions): Promise<void>;
  updateRunId(keyShare: string, runId: string, options?: RepositoryOptions): Promise<void>;
}
