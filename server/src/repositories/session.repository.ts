import { Session } from '../models/session.model';
import { ISessionRepository, RepositoryOptions } from './interfaces/session-repository.interface';

export class SessionRepository implements ISessionRepository {
  
  private applyScope(where: any, options?: RepositoryOptions) {
    if (options?.userId) {
        return { ...where, userId: options.userId };
    }
    return where;
  }

  async create(data: Partial<Session>, options?: RepositoryOptions): Promise<Session> {
    const finalData = { ...data };
    if (options?.userId) {
        finalData.userId = options.userId;
    }
    return await Session.create(finalData, { transaction: options?.transaction });
  }

  async update(keyShare: string, data: Partial<Session>, options?: RepositoryOptions): Promise<number> {
    const where = this.applyScope({ keyShare }, options);
    const [count] = await Session.update(data, {
      where,
      transaction: options?.transaction
    });
    return count;
  }

  async findByKeyShare(keyShare: string, options?: RepositoryOptions): Promise<Session | null> {
    const where = this.applyScope({ keyShare }, options);
    return await Session.findOne({
      where,
      transaction: options?.transaction
    });
  }

  async findById(id: string, options?: RepositoryOptions): Promise<Session | null> {
    const where = this.applyScope({ id }, options);
    return await Session.findOne({
      where,
      transaction: options?.transaction
    });
  }

  async findAll(options?: RepositoryOptions): Promise<Session[]> {
    const where = this.applyScope({}, options);
    return await Session.findAll({ 
        where, 
        transaction: options?.transaction 
    });
  }

  async delete(keyShare: string, options?: RepositoryOptions): Promise<void> {
    const where = this.applyScope({ keyShare }, options);
    await Session.destroy({
      where,
      transaction: options?.transaction
    });
  }

  async updateStatus(keyShare: string, status: 'active' | 'expired' | 'paused', options?: RepositoryOptions): Promise<void> {
    const where = this.applyScope({ keyShare }, options);
    await Session.update({ status }, {
      where,
      transaction: options?.transaction
    });
  }

  async updateRunId(keyShare: string, runId: string, options?: RepositoryOptions): Promise<void> {
    const where = this.applyScope({ keyShare }, options);
    await Session.update({ runId }, {
      where,
      transaction: options?.transaction
    });
  }
}
