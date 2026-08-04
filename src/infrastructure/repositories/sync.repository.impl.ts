import { LectureProgress, Favorite, OfflineDownload, QuizResult } from '../../models/index';
import { ISyncRepository } from '../../modules/sync/domain/sync.repository.interface';

export class SyncRepository implements ISyncRepository {
  async syncProgress(userId: string, progressData: any[]): Promise<void> {
    for (const progress of progressData) {
      await LectureProgress.findOneAndUpdate(
        { userId, documentId: progress.documentId },
        { ...progress, derniereLecture: new Date() },
        { upsert: true, new: true }
      ).exec();
    }
  }

  async syncFavorites(userId: string, favoritesData: any[]): Promise<void> {
    for (const fav of favoritesData) {
      await Favorite.findOneAndUpdate(
        { userId, documentId: fav.documentId },
        { userId, documentId: fav.documentId },
        { upsert: true, new: true }
      ).exec();
    }
  }

  async syncOfflineDownloads(userId: string, downloadsData: any[]): Promise<void> {
    for (const dl of downloadsData) {
      await OfflineDownload.findOneAndUpdate(
        { userId, documentId: dl.documentId },
        { userId, documentId: dl.documentId, dateTelechargement: new Date() },
        { upsert: true, new: true }
      ).exec();
    }
  }

  async syncQuizResults(userId: string, resultsData: any[]): Promise<void> {
    for (const result of resultsData) {
      await QuizResult.findOneAndUpdate(
        { userId, quizId: result.quizId, date: result.date },
        { ...result, userId },
        { upsert: true, new: true }
      ).exec();
    }
  }

  async getUserSyncData(userId: string, lastSyncDate: Date): Promise<any> {
    const [progress, favorites, downloads, results] = await Promise.all([
      LectureProgress.find({ userId, derniereLecture: { $gte: lastSyncDate } }).exec(),
      Favorite.find({ userId, createdAt: { $gte: lastSyncDate } }).exec(),
      OfflineDownload.find({ userId, dateTelechargement: { $gte: lastSyncDate } }).exec(),
      QuizResult.find({ userId, date: { $gte: lastSyncDate } }).exec(),
    ]);

    return {
      progress,
      favorites,
      downloads,
      results,
    };
  }
}
