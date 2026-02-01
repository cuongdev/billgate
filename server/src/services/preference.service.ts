import { PreferenceRepository } from '../repositories/preference.repository';

const USER_KEY_PREFIX = 'user:';

export class PreferenceService {
  private repo: PreferenceRepository;

  constructor() {
    this.repo = new PreferenceRepository();
  }

  /** Get all preferences for the given user (scoped by userId). */
  async getAll(userId: string): Promise<Record<string, any>> {
    return await this.repo.getAllByUserId(userId);
  }

  /** Get one preference for the given user. */
  async get(userId: string, key: string): Promise<any> {
    return await this.repo.get(null, `${USER_KEY_PREFIX}${userId}:${key}`);
  }

  /** Set one preference for the given user. */
  async set(userId: string, key: string, value: any): Promise<void> {
    await this.repo.set(null, `${USER_KEY_PREFIX}${userId}:${key}`, value);
  }

  async updateMany(userId: string, prefs: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(prefs)) {
      await this.set(userId, key, value);
    }
  }
}

export const preferenceService = new PreferenceService();
