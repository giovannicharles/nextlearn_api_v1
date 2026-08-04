import { IFavorite } from '../../../models/index';

export interface IFavoriteRepository {
  addFavorite(userId: string, documentId: string): Promise<IFavorite>;
  removeFavorite(userId: string, documentId: string): Promise<void>;
  listUserFavorites(userId: string, options: any): Promise<{ favorites: IFavorite[]; total: number }>;
  isFavorite(userId: string, documentId: string): Promise<boolean>;
}
