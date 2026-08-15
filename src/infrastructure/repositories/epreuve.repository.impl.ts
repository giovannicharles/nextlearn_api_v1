import { Epreuve, EpreuveRating } from '../../models/index';
import { IEpreuveRepository } from '../../modules/epreuves/domain/epreuve.repository.interface';
import { NotFoundError } from '../../shared/errors/index';

const REF_POPULATE = [
  { path: 'matiereId', select: 'nom' },
  { path: 'universiteId', select: 'nom' },
];

export class EpreuveRepository implements IEpreuveRepository {
  async findById(id: string): Promise<any | null> {
    return await Epreuve.findById(id).populate(REF_POPULATE).exec();
  }

  async listEpreuves(filters: any, options: any): Promise<{ epreuves: any[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const query: any = { actif: true };
    if (filters.matiereId) query.matiereId = filters.matiereId;
    if (filters.niveau) query.niveau = filters.niveau;
    if (filters.annee) query.annee = filters.annee;
    if (filters.universiteId) query.universiteId = filters.universiteId;
    if (filters.filiereId) query.filiereId = filters.filiereId;

    const [epreuves, total] = await Promise.all([
      Epreuve.find(query).populate(REF_POPULATE).sort({ annee: -1 }).skip(skip).limit(limit).exec(),
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

  async createRating(data: Partial<any>): Promise<any> {
    return await EpreuveRating.create(data);
  }

  async updateEpreuveRating(epreuveId: string): Promise<void> {
    const ratings = await EpreuveRating.find({ epreuveId }).exec();
    if (ratings.length === 0) return;

    const avgRating = ratings.reduce((sum, r) => sum + r.note, 0) / ratings.length;
    await Epreuve.findByIdAndUpdate(epreuveId, { noteMoyenne: avgRating }).exec();
  }

  async getUserRating(userId: string, epreuveId: string): Promise<any | null> {
    return await EpreuveRating.findOne({ userId, epreuveId }).exec();
  }
}
