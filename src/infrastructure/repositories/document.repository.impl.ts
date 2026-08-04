import { Document, DocumentRating } from '../../models/index';
import { IDocumentRepository } from '../../modules/documents/domain/document.repository.interface';
import { NotFoundError } from '../../shared/errors/index';

export class DocumentRepository implements IDocumentRepository {
  async findById(id: string): Promise<any | null> {
    return await Document.findById(id).exec();
  }

  async listDocuments(filters: any, options: any): Promise<{ documents: any[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const query: any = { actif: true };
    if (filters.matiereId) query.matiereId = filters.matiereId;
    if (filters.niveau) query.niveau = filters.niveau;
    if (filters.type) query.type = filters.type;
    if (filters.universiteId) query.universiteId = filters.universiteId;
    if (filters.anneeAcademique) query.anneeAcademique = filters.anneeAcademique;

    const [documents, total] = await Promise.all([
      Document.find(query).sort({ dateAjout: -1 }).skip(skip).limit(limit).exec(),
      Document.countDocuments(query),
    ]);

    return { documents, total };
  }

  async searchDocuments(query: string, options: any): Promise<{ documents: any[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      Document.find(
        { $text: { $search: query }, actif: true },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .exec(),
      Document.countDocuments({ $text: { $search: query }, actif: true }),
    ]);

    return { documents, total };
  }

  async createDocument(data: Partial<any>): Promise<any> {
    return await Document.create(data);
  }

  async updateDocument(id: string, data: Partial<any>): Promise<any> {
    const document = await Document.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!document) throw new NotFoundError('Document');
    return document;
  }

  async deleteDocument(id: string): Promise<void> {
    const document = await Document.findByIdAndUpdate(id, { actif: false }).exec();
    if (!document) throw new NotFoundError('Document');
  }

  async incrementViews(id: string): Promise<void> {
    await Document.findByIdAndUpdate(id, { $inc: { vues: 1 } }).exec();
  }

  async incrementDownloads(id: string): Promise<void> {
    await Document.findByIdAndUpdate(id, { $inc: { telechargements: 1 } }).exec();
  }

  async createRating(data: Partial<any>): Promise<any> {
    return await DocumentRating.create(data);
  }

  async updateDocumentRating(documentId: string): Promise<void> {
    const ratings = await DocumentRating.find({ documentId }).exec();
    if (ratings.length === 0) return;

    const avgRating = ratings.reduce((sum, r) => sum + r.note, 0) / ratings.length;
    await Document.findByIdAndUpdate(documentId, { noteMoyenne: avgRating }).exec();
  }

  async getUserRating(userId: string, documentId: string): Promise<any | null> {
    return await DocumentRating.findOne({ userId, documentId }).exec();
  }

  async getPopular(limit: number): Promise<any[]> {
    return await Document.find({ actif: true }).sort({ telechargements: -1 }).limit(limit).exec();
  }

  async getRecent(limit: number): Promise<any[]> {
    return await Document.find({ actif: true }).sort({ dateAjout: -1 }).limit(limit).exec();
  }

  async getRecommended(universiteId: number | undefined, niveau: string | undefined, limit: number): Promise<any[]> {
    const query: any = { actif: true };
    if (universiteId) query.universiteId = universiteId;
    if (niveau) query.niveau = niveau;

    const primary = await Document.find(query).sort({ telechargements: -1 }).limit(limit).exec();

    if (primary.length >= limit) return primary;

    const excludeIds = primary.map((d: any) => d._id);
    const remaining = limit - primary.length;
    const fallback = await Document.find({ actif: true, _id: { $nin: excludeIds } })
      .sort({ telechargements: -1 })
      .limit(remaining)
      .exec();

    return [...primary, ...fallback];
  }
}
