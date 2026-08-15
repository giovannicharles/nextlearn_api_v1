import { IEpreuve, IEpreuveRating } from '../../../models/index';

export interface IEpreuveRepository {
  findById(id: string): Promise<IEpreuve | null>;
  listEpreuves(filters: any, options: any): Promise<{ epreuves: IEpreuve[]; total: number }>;
  createEpreuve(data: Partial<IEpreuve>): Promise<IEpreuve>;
  updateEpreuve(id: string, data: Partial<IEpreuve>): Promise<IEpreuve>;
  deleteEpreuve(id: string): Promise<void>;
  incrementViews(id: string): Promise<void>;
  incrementDownloads(id: string): Promise<void>;

  // Ratings
  createRating(data: Partial<IEpreuveRating>): Promise<IEpreuveRating>;
  updateEpreuveRating(epreuveId: string): Promise<void>;
  getUserRating(userId: string, epreuveId: string): Promise<IEpreuveRating | null>;
}
