import { IOfflineRepository } from './domain/offline.repository.interface';
import { parsePagination, createPaginationMeta } from '../../shared/utils/pagination';

export class OfflineService {
  constructor(private offlineRepository: IOfflineRepository) {}

  async addDownload(userId: string, documentId: string) {
    return await this.offlineRepository.addDownload(userId, documentId);
  }

  async removeDownload(userId: string, documentId: string) {
    await this.offlineRepository.removeDownload(userId, documentId);
  }

  async listUserDownloads(userId: string, options: any) {
    const { page, limit } = parsePagination(options);
    const { downloads, total } = await this.offlineRepository.listUserDownloads(userId, { page, limit });
    return {
      data: downloads,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async isDownloaded(userId: string, documentId: string) {
    return await this.offlineRepository.isDownloaded(userId, documentId);
  }
}
