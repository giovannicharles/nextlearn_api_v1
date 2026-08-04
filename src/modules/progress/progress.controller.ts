import { Response } from 'express';
import { ProgressService } from './progress.service';
import { successResponse } from '../../shared/http/response';
import { AuthRequest } from '../../middleware/auth.guard';

export class ProgressController {
  constructor(private progressService: ProgressService) {}

  async getLectureProgress(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const { documentId } = req.params;
    const result = await this.progressService.getLectureProgress(userId, documentId);
    successResponse(res, result);
  }

  async updateLectureProgress(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const { documentId } = req.params;
    const result = await this.progressService.updateLectureProgress(userId, documentId, req.body);
    successResponse(res, result);
  }

  async listUserProgress(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const { page, limit } = req.query;
    const result = await this.progressService.listUserProgress(userId, { page: Number(page), limit: Number(limit) });
    successResponse(res, result.data, 200, result.meta);
  }

  async createStudySession(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const result = await this.progressService.createStudySession(userId, req.body);
    successResponse(res, result, 201);
  }

  async listStudySessions(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const { page, limit } = req.query;
    const result = await this.progressService.listStudySessions(userId, { page: Number(page), limit: Number(limit) });
    successResponse(res, result.data, 200, result.meta);
  }

  async getStudyStats(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const result = await this.progressService.getStudyStats(userId);
    successResponse(res, result);
  }
}
