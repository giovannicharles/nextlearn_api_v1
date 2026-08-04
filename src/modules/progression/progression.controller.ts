import { Response } from 'express';
import { ProgressionService } from './progression.service';
import { successResponse } from '../../shared/http/response';
import { AuthRequest } from '../../middleware/auth.guard';

export class ProgressionController {
  constructor(private progressionService: ProgressionService) {}

  async getStats(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const result = await this.progressionService.getStats(userId);
    successResponse(res, result);
  }

  async getStreak(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const streak = await this.progressionService.getStreak(userId);
    successResponse(res, { streak });
  }

  async getWeekActivity(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const result = await this.progressionService.getWeekActivity(userId);
    successResponse(res, result);
  }

  async getMatiereActivity(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const result = await this.progressionService.getMatiereActivity(userId);
    successResponse(res, result);
  }

  async createStudySession(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const { documentId, dureeSecondes, pagesLues, date } = req.body;
    const result = await this.progressionService.createStudySession(
      userId,
      documentId,
      dureeSecondes,
      pagesLues,
      date ? new Date(date) : undefined
    );
    successResponse(res, result, 201);
  }

  async getBadges(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const result = await this.progressionService.getBadges(userId);
    successResponse(res, result);
  }

  async checkBadges(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const result = await this.progressionService.checkAndAwardBadges(userId);
    successResponse(res, result);
  }
}
