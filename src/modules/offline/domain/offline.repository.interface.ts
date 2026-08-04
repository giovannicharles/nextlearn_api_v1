import { IOfflineDownload } from '../../../models/index';

export interface IOfflineRepository {
  addDownload(userId: string, documentId: string): Promise<IOfflineDownload>;
  removeDownload(userId: string, documentId: string): Promise<void>;
  listUserDownloads(userId: string, options: any): Promise<{ downloads: IOfflineDownload[]; total: number }>;
  isDownloaded(userId: string, documentId: string): Promise<boolean>;
}
