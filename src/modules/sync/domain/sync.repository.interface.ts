export interface ISyncRepository {
  syncProgress(userId: string, progressData: any[]): Promise<void>;
  syncFavorites(userId: string, favoritesData: any[]): Promise<void>;
  syncOfflineDownloads(userId: string, downloadsData: any[]): Promise<void>;
  syncQuizResults(userId: string, resultsData: any[]): Promise<void>;
  getUserSyncData(userId: string, lastSyncDate: Date): Promise<any>;
}
