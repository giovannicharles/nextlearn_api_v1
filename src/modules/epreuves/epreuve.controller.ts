import { Request, Response } from 'express';
import { EpreuveService } from './epreuve.service';
import { ratingSchema } from '../documents/dto/rating.dto';
import { successResponse } from '../../shared/http/response';
import { AuthRequest } from '../../middleware/auth.guard';

export class EpreuveController {
  constructor(private epreuveService: EpreuveService) {}

  async listEpreuves(req: Request, res: Response): Promise<void> {
    const { page, limit, matiereId, niveau, annee, universiteId, filiereId } = req.query;
    const filters = { matiereId, niveau, annee, universiteId, filiereId };
    const options = { page: Number(page), limit: Number(limit) };
    const result = await this.epreuveService.listEpreuves(filters, options);
    successResponse(res, result.data, 200, result.meta);
  }

  async getEpreuveById(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const result = await this.epreuveService.getEpreuveById(id);
    successResponse(res, result);
  }

  async createEpreuve(req: Request, res: Response): Promise<void> {
    const result = await this.epreuveService.createEpreuve(req.body, (req as any).files?.epreuve?.[0]?.buffer, (req as any).files?.corrige?.[0]?.buffer);
    successResponse(res, result, 201);
  }

  async updateEpreuve(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const result = await this.epreuveService.updateEpreuve(id, req.body);
    successResponse(res, result);
  }

  async deleteEpreuve(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    await this.epreuveService.deleteEpreuve(id);
    successResponse(res, { message: 'Épreuve supprimée' });
  }

  async getSignedUrl(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const { type } = req.query;
    const url = await this.epreuveService.getSignedUrl(id, type as 'epreuve' | 'corrige');
    successResponse(res, { url });
  }

  async incrementViews(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    await this.epreuveService.incrementViews(id);
    successResponse(res, { message: 'Vues incrémentées' });
  }

  async downloadEpreuve(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const { type } = req.query;
    const url = await this.epreuveService.downloadEpreuve(id, type as 'epreuve' | 'corrige');
    successResponse(res, { url, expiresIn: 3600 });
  }

  async rateEpreuve(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const id = String(req.params.id);
    const validatedData = ratingSchema.parse(req.body);
    await this.epreuveService.rateEpreuve(userId, id, validatedData.note);
    successResponse(res, { message: 'Note enregistrée' });
  }
}
