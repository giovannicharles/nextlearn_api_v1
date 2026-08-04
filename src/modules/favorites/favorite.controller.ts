import { Response } from 'express';
import { FavoriteService } from './favorite.service';
import { successResponse } from '../../shared/http/response';
import { AuthRequest } from '../../middleware/auth.guard';

export class FavoriteController {
  constructor(private favoriteService: FavoriteService) {}

  async addFavorite(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const documentId = String(req.params.documentId);
    const result = await this.favoriteService.addFavorite(userId, documentId);
    successResponse(res, result, 201);
  }

  async removeFavorite(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const documentId = String(req.params.documentId);
    await this.favoriteService.removeFavorite(userId, documentId);
    successResponse(res, { message: 'Favori supprimé' });
  }

  async listFavorites(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const { page, limit } = req.query;
    const result = await this.favoriteService.listUserFavorites(userId, { page: Number(page), limit: Number(limit) });
    successResponse(res, result.data, 200, result.meta);
  }

  async checkFavorite(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const documentId = String(req.params.documentId);
    const isFavorite = await this.favoriteService.isFavorite(userId, documentId);
    successResponse(res, { isFavorite });
  }
}
