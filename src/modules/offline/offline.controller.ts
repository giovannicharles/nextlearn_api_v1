import { Response } from 'express';
import { OfflineService } from './offline.service';
import { successResponse } from '../../shared/http/response';
import { AuthRequest } from '../../middleware/auth.guard';

export class OfflineController {
  constructor(private offlineService: OfflineService) {}

  async addDownload(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const { documentId } = req.params;
    const result = await this.offlineService.addDownload(userId, documentId);
    successResponse(res, result, 201);
  }

  async removeDownload(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const { documentId } = req.params;
    await this.offlineService.removeDownload(userId, documentId);
    successResponse(res, { message: 'Téléchargement supprimé' });
  }

  async listDownloads(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const { page, limit } = req.query;
    const result = await this.offlineService.listUserDownloads(userId, { page: Number(page), limit: Number(limit) });
    successResponse(res, result.data, 200, result.meta);
  }

  async checkDownloaded(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const { documentId } = req.params;
    const isDownloaded = await this.offlineService.isDownloaded(userId, documentId);
    successResponse(res, { isDownloaded });
  }
}
