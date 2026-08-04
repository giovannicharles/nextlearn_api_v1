import { OfflineDownload } from '../../models/index';
import { IOfflineRepository } from '../../modules/offline/domain/offline.repository.interface';
import { ConflictError, NotFoundError } from '../../shared/errors/index';

export class OfflineRepository implements IOfflineRepository {
  async addDownload(userId: string, documentId: string): Promise<any> {
    try {
      return await OfflineDownload.create({ userId, documentId });
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictError('Document déjà téléchargé');
      }
      throw error;
    }
  }

  async removeDownload(userId: string, documentId: string): Promise<void> {
    const download = await OfflineDownload.findOneAndDelete({ userId, documentId }).exec();
    if (!download) throw new NotFoundError('Téléchargement');
  }

  async listUserDownloads(userId: string, options: any): Promise<{ downloads: any[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [downloads, total] = await Promise.all([
      OfflineDownload.find({ userId })
        .populate('documentId')
        .sort({ dateTelechargement: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      OfflineDownload.countDocuments({ userId }),
    ]);

    return { downloads, total };
  }

  async isDownloaded(userId: string, documentId: string): Promise<boolean> {
    const download = await OfflineDownload.findOne({ userId, documentId }).exec();
    return !!download;
  }
}
