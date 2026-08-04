import { Response } from 'express';
import { SyncService } from './sync.service';
import { successResponse } from '../../shared/http/response';
import { AuthRequest } from '../../middleware/auth.guard';

export class SyncController {
  constructor(private syncService: SyncService) {}

  async syncData(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const result = await this.syncService.syncData(userId, req.body);
    successResponse(res, result);
  }

  async getSyncData(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const { lastSyncDate } = req.query;
    const result = await this.syncService.getUserSyncData(userId, lastSyncDate as string);
    successResponse(res, result);
  }
}
