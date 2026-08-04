import { IFavoriteRepository } from './domain/favorite.repository.interface';
import { parsePagination, createPaginationMeta } from '../../shared/utils/pagination';

export class FavoriteService {
  constructor(private favoriteRepository: IFavoriteRepository) {}

  async addFavorite(userId: string, documentId: string) {
    return await this.favoriteRepository.addFavorite(userId, documentId);
  }

  async removeFavorite(userId: string, documentId: string) {
    await this.favoriteRepository.removeFavorite(userId, documentId);
  }

  async listUserFavorites(userId: string, options: any) {
    const { page, limit } = parsePagination(options);
    const { favorites, total } = await this.favoriteRepository.listUserFavorites(userId, { page, limit });
    return {
      data: favorites,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async isFavorite(userId: string, documentId: string) {
    return await this.favoriteRepository.isFavorite(userId, documentId);
  }
}
