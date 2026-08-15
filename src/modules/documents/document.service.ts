import { IDocumentRepository } from './domain/document.repository.interface';
import { StorageService } from '../../infrastructure/storage/storage.interface';
import { NotFoundError } from '../../shared/errors/index';
import { parsePagination, createPaginationMeta } from '../../shared/utils/pagination';
import { DocumentRating, Matiere } from '../../models/index';
import { DocumentNotifierService } from '../notifications/document-notifier.service';

export class DocumentService {
  constructor(
    private documentRepository: IDocumentRepository,
    private storageService: StorageService
  ) {}

  async listDocuments(filters: any, options: any) {
    const { page, limit, skip } = parsePagination(options);
    const { documents, total } = await this.documentRepository.listDocuments(filters, { page, limit });
    return {
      data: documents,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async searchDocuments(query: string, options: any) {
    const { page, limit, skip } = parsePagination(options);
    const { documents, total } = await this.documentRepository.searchDocuments(query, { page, limit });
    return {
      data: documents,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getDocumentById(id: string, userId?: string) {
    const document = await this.documentRepository.findById(id);
    if (!document) throw new NotFoundError('Document');
    return document;
  }

  async incrementViews(id: string) {
    const document = await this.documentRepository.findById(id);
    if (!document) throw new NotFoundError('Document');
    await this.documentRepository.incrementViews(id);
  }

  async downloadDocument(id: string) {
    const document = await this.documentRepository.findById(id);
    if (!document) throw new NotFoundError('Document');

    await this.documentRepository.incrementDownloads(id);

    const publicId = this.extractPublicIdFromUrl(document.urlPdf);
    const url = await this.storageService.getSignedUrl(publicId, 3600);
    return { url, expiresIn: 3600 };
  }

  async getPopular(limit: number = 10) {
    return await this.documentRepository.getPopular(limit);
  }

  async getRecent(limit: number = 10) {
    return await this.documentRepository.getRecent(limit);
  }

  async getRecommended(universiteId: string | undefined, niveau: string | undefined, limit: number = 6) {
    return await this.documentRepository.getRecommended(universiteId, niveau, limit);
  }

  async createDocument(data: any, file: Buffer) {
    const { pages, size } = await this.storageService.extractPdfMetadata(file);
    const uploadResult = await this.storageService.uploadFile(file, 'nextlearn/documents');

    const document = await this.documentRepository.createDocument({
      ...data,
      urlPdf: uploadResult.url,
      tailleMb: size / (1024 * 1024),
      pages,
      dateAjout: new Date(),
    });

    // Notification des étudiants concernés, déclenchée par la publication
    // elle-même. Un échec d'envoi ne doit jamais faire échouer l'upload : le
    // document est déjà en base et visible, seule la notification manquerait.
    try {
      const matiere = await Matiere.findById(document.matiereId).select('nom').lean();
      await DocumentNotifierService.notifyNewDocument({
        id: String(document._id),
        titre: document.titre,
        matiereNom: (matiere as any)?.nom,
        niveau: document.niveau,
        filiereId: document.filiereId,
        universiteId: document.universiteId,
      });
    } catch (error) {
      console.error('[NOTIFICATION] Échec du ciblage après upload :', error);
    }

    return document;
  }

  // `file` optionnel : l'admin peut remplacer le PDF d'un document existant
  // (l'UI le proposait déjà, mais la route ne parsait pas le multipart).
  // L'ancien fichier n'est supprimé du stockage qu'une fois le nouveau uploadé
  // et la base mise à jour, pour ne jamais laisser un document sans PDF.
  async updateDocument(id: string, data: any, file?: Buffer) {
    const existing = await this.documentRepository.findById(id);
    if (!existing) throw new NotFoundError('Document');

    const payload = { ...data };

    if (file) {
      const { pages, size } = await this.storageService.extractPdfMetadata(file);
      const uploadResult = await this.storageService.uploadFile(file, 'nextlearn/documents');
      payload.urlPdf = uploadResult.url;
      payload.tailleMb = size / (1024 * 1024);
      payload.pages = pages;
    }

    const updated = await this.documentRepository.updateDocument(id, payload);

    if (file && existing.urlPdf) {
      try {
        await this.storageService.deleteFile(this.extractPublicIdFromUrl(existing.urlPdf));
      } catch {
        // Fichier orphelin sur Cloudinary : sans gravité, on ne fait pas
        // échouer une modification déjà persistée pour autant.
      }
    }

    return updated;
  }

  async deleteDocument(id: string) {
    const document = await this.documentRepository.findById(id);
    if (!document) throw new NotFoundError('Document');
    
    if (document.urlPdf) {
      const publicId = this.extractPublicIdFromUrl(document.urlPdf);
      await this.storageService.deleteFile(publicId);
    }
    
    await this.documentRepository.deleteDocument(id);
  }

  async getSignedUrl(documentId: string) {
    const document = await this.documentRepository.findById(documentId);
    if (!document) throw new NotFoundError('Document');
    
    const publicId = this.extractPublicIdFromUrl(document.urlPdf);
    return await this.storageService.getSignedUrl(publicId, 3600);
  }

  async rateDocument(userId: string, documentId: string, note: number) {
    const existingRating = await this.documentRepository.getUserRating(userId, documentId);
    if (existingRating) {
      await DocumentRating.findByIdAndUpdate(existingRating.id, { note });
    } else {
      await this.documentRepository.createRating({ userId, documentId, note });
    }
    await this.documentRepository.updateDocumentRating(documentId);
  }

  private extractPublicIdFromUrl(url: string): string {
    const urlParts = url.split('/upload/');
    if (urlParts.length < 2) {
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      return filename.split('.')[0];
    }
    const afterUpload = urlParts[1];
    const segments = afterUpload.split('/');
    const versionRegex = /^v\d+$/;
    const startIndex = versionRegex.test(segments[0]) ? 1 : 0;
    const pathSegments = segments.slice(startIndex);
    const lastSegment = pathSegments[pathSegments.length - 1];
    pathSegments[pathSegments.length - 1] = lastSegment.split('.')[0];
    return pathSegments.join('/');
  }
}
