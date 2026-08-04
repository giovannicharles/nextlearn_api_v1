import { Epreuve } from '../../models/index';
import { IEpreuveRepository } from '../../modules/epreuves/domain/epreuve.repository.interface';
import { NotFoundError } from '../../shared/errors/index';

export class EpreuveRepository implements IEpreuveRepository {
  async findById(id: string): Promise<any | null> {
    return await Epreuve.findById(id).exec();
  }

  async listEpreuves(filters: any, options: any): Promise<{ epreuves: any[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const query: any = { actif: true };
    if (filters.matiereId) query.matiereId = filters.matiereId;
    if (filters.niveau) query.niveau = filters.niveau;
    if (filters.annee) query.annee = filters.annee;

    const [epreuves, total] = await Promise.all([
      Epreuve.find(query).sort({ annee: -1 }).skip(skip).limit(limit).exec(),
      Epreuve.countDocuments(query),
    ]);

    return { epreuves, total };
  }

  async createEpreuve(data: Partial<any>): Promise<any> {
    return await Epreuve.create(data);
  }

  async updateEpreuve(id: string, data: Partial<any>): Promise<any> {
    const epreuve = await Epreuve.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!epreuve) throw new NotFoundError('Épreuve');
    return epreuve;
  }

  async deleteEpreuve(id: string): Promise<void> {
    const epreuve = await Epreuve.findByIdAndUpdate(id, { actif: false }).exec();
    if (!epreuve) throw new NotFoundError('Épreuve');
  }

  async incrementViews(id: string): Promise<void> {
    await Epreuve.findByIdAndUpdate(id, { $inc: { vues: 1 } }).exec();
  }

  async incrementDownloads(id: string): Promise<void> {
    await Epreuve.findByIdAndUpdate(id, { $inc: { telechargements: 1 } }).exec();
  }
}
