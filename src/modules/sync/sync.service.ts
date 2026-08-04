import { ISyncRepository } from './domain/sync.repository.interface';

export class SyncService {
  constructor(private syncRepository: ISyncRepository) {}

  async syncData(userId: string, data: any) {
    if (data.progress && data.progress.length > 0) {
      await this.syncRepository.syncProgress(userId, data.progress);
    }

    if (data.favorites && data.favorites.length > 0) {
      await this.syncRepository.syncFavorites(userId, data.favorites);
    }

    if (data.downloads && data.downloads.length > 0) {
      await this.syncRepository.syncOfflineDownloads(userId, data.downloads);
    }

    if (data.results && data.results.length > 0) {
      await this.syncRepository.syncQuizResults(userId, data.results);
    }

    return { message: 'Synchronisation réussie' };
  }

  async getUserSyncData(userId: string, lastSyncDate?: string) {
    const date = lastSyncDate ? new Date(lastSyncDate) : new Date(0);
    return await this.syncRepository.getUserSyncData(userId, date);
  }
}
