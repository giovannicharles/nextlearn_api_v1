import { OfflineDownload } from '../../models/index';
import { IOfflineRepository } from '../../modules/offline/domain/offline.repository.interface';

export class OfflineRepository implements IOfflineRepository {
  // Marquer/démarquer un document hors ligne est idempotent : le client rejoue
  // ces appels depuis sa file de synchronisation au retour du réseau, et un
  // même document peut être téléchargé depuis deux appareils. Renvoyer 409 ou
  // 404 sur un rejeu bloquerait l'opération en file indéfiniment.
  async addDownload(userId: string, documentId: string): Promise<any> {
    return await OfflineDownload.findOneAndUpdate(
      { userId, documentId },
      { $setOnInsert: { userId, documentId } },
      { upsert: true, new: true },
    ).exec();
  }

  async removeDownload(userId: string, documentId: string): Promise<void> {
    await OfflineDownload.findOneAndDelete({ userId, documentId }).exec();
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
