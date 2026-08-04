import { IDocument, IDocumentRating } from '../../../models/index';

export interface IDocumentRepository {
  findById(id: string): Promise<IDocument | null>;
  listDocuments(filters: any, options: any): Promise<{ documents: IDocument[]; total: number }>;
  searchDocuments(query: string, options: any): Promise<{ documents: IDocument[]; total: number }>;
  createDocument(data: Partial<IDocument>): Promise<IDocument>;
  updateDocument(id: string, data: Partial<IDocument>): Promise<IDocument>;
  deleteDocument(id: string): Promise<void>;
  incrementViews(id: string): Promise<void>;
  incrementDownloads(id: string): Promise<void>;
  getPopular(limit: number): Promise<IDocument[]>;
  getRecent(limit: number): Promise<IDocument[]>;
  getRecommended(universiteId: number | undefined, niveau: string | undefined, limit: number): Promise<IDocument[]>;
  
  // Ratings
  createRating(data: Partial<IDocumentRating>): Promise<IDocumentRating>;
  updateDocumentRating(documentId: string): Promise<void>;
  getUserRating(userId: string, documentId: string): Promise<IDocumentRating | null>;
}
