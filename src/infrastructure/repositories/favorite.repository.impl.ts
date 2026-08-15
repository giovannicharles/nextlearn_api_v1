import { Favorite } from '../../models/index';
import { IFavoriteRepository } from '../../modules/favorites/domain/favorite.repository.interface';

export class FavoriteRepository implements IFavoriteRepository {
  // Ajouter/retirer un favori est idempotent : le client rejoue ces appels
  // depuis sa file de synchronisation au retour du réseau, et le même document
  // peut être mis en favori depuis deux appareils. Un 409 ou un 404 sur un
  // rejeu bloquerait l'opération en file indéfiniment.
  async addFavorite(userId: string, documentId: string): Promise<any> {
    return await Favorite.findOneAndUpdate(
      { userId, documentId },
      { $setOnInsert: { userId, documentId } },
      { upsert: true, new: true },
    ).exec();
  }

  async removeFavorite(userId: string, documentId: string): Promise<void> {
    await Favorite.findOneAndDelete({ userId, documentId }).exec();
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
