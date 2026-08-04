import { Favorite } from '../../models/index';
import { IFavoriteRepository } from '../../modules/favorites/domain/favorite.repository.interface';
import { ConflictError, NotFoundError } from '../../shared/errors/index';

export class FavoriteRepository implements IFavoriteRepository {
  async addFavorite(userId: string, documentId: string): Promise<any> {
    try {
      return await Favorite.create({ userId, documentId });
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictError('Document déjà en favoris');
      }
      throw error;
    }
  }

  async removeFavorite(userId: string, documentId: string): Promise<void> {
    const favorite = await Favorite.findOneAndDelete({ userId, documentId }).exec();
    if (!favorite) throw new NotFoundError('Favori');
  }

  async listUserFavorites(userId: string, options: any): Promise<{ favorites: any[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      Favorite.find({ userId })
        .populate('documentId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Favorite.countDocuments({ userId }),
    ]);

    return { favorites, total };
  }

  async isFavorite(userId: string, documentId: string): Promise<boolean> {
    const favorite = await Favorite.findOne({ userId, documentId }).exec();
    return !!favorite;
  }
}
