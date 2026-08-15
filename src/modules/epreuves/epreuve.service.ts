import { IEpreuveRepository } from './domain/epreuve.repository.interface';
import { StorageService } from '../../infrastructure/storage/storage.interface';
import { NotFoundError } from '../../shared/errors/index';
import { parsePagination, createPaginationMeta } from '../../shared/utils/pagination';
import { Matiere, EpreuveRating } from '../../models/index';
import { DocumentNotifierService } from '../notifications/document-notifier.service';

export class EpreuveService {
  constructor(
    private epreuveRepository: IEpreuveRepository,
    private storageService: StorageService
  ) {}

  async listEpreuves(filters: any, options: any) {
    const { page, limit } = parsePagination(options);
    const { epreuves, total } = await this.epreuveRepository.listEpreuves(filters, { page, limit });
    return {
      data: epreuves,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getEpreuveById(id: string) {
    const epreuve = await this.epreuveRepository.findById(id);
    if (!epreuve) throw new NotFoundError('Épreuve');
    await this.epreuveRepository.incrementViews(id);
    return epreuve;
  }

  async createEpreuve(data: any, file?: Buffer, corrigeFile?: Buffer) {
    let urlPdf = data.urlPdf;
    let urlCorrigePdf = data.urlCorrigePdf;

    if (file) {
      const uploadResult = await this.storageService.uploadFile(file, 'nextlearn/epreuves');
      urlPdf = uploadResult.url;
    }

    if (corrigeFile) {
      const uploadResult = await this.storageService.uploadFile(corrigeFile, 'nextlearn/epreuves');
      urlCorrigePdf = uploadResult.url;
    }

    const epreuve = await this.epreuveRepository.createEpreuve({
      ...data,
      urlPdf,
      urlCorrigePdf,
    });

    // Même ciblage que pour les documents : l'épreuve est publiée depuis le
    // même formulaire admin, elle doit notifier la même audience.
    try {
      const matiere = await Matiere.findById(epreuve.matiereId).select('nom').lean();
      await DocumentNotifierService.notifyNewDocument(
        {
          id: String(epreuve._id),
          titre: `Épreuve ${epreuve.annee}`,
          matiereNom: (matiere as any)?.nom,
          niveau: epreuve.niveau,
          filiereId: epreuve.filiereId,
          universiteId: epreuve.universiteId,
        },
        'epreuve',
      );
    } catch (error) {
      console.error('[NOTIFICATION] Échec du ciblage après publication d’épreuve :', error);
    }

    return epreuve;
  }

  async updateEpreuve(id: string, data: any) {
    return await this.epreuveRepository.updateEpreuve(id, data);
  }

  async deleteEpreuve(id: string) {
    const epreuve = await this.epreuveRepository.findById(id);
    if (!epreuve) throw new NotFoundError('Épreuve');

    if (epreuve.urlPdf) {
      const publicId = this.extractPublicIdFromUrl(epreuve.urlPdf);
      await this.storageService.deleteFile(publicId);
    }

    if (epreuve.urlCorrigePdf) {
      const publicId = this.extractPublicIdFromUrl(epreuve.urlCorrigePdf);
      await this.storageService.deleteFile(publicId);
    }

    await this.epreuveRepository.deleteEpreuve(id);
  }

  async getSignedUrl(id: string, type: 'epreuve' | 'corrige') {
    const epreuve = await this.epreuveRepository.findById(id);
    if (!epreuve) throw new NotFoundError('Épreuve');

    const url = type === 'epreuve' ? epreuve.urlPdf : epreuve.urlCorrigePdf;
    if (!url) throw new NotFoundError('Fichier');

    const publicId = this.extractPublicIdFromUrl(url);
    return await this.storageService.getSignedUrl(publicId, 3600);
  }

  async incrementViews(id: string): Promise<void> {
    await this.epreuveRepository.incrementViews(id);
  }

  async rateEpreuve(userId: string, epreuveId: string, note: number) {
    const epreuve = await this.epreuveRepository.findById(epreuveId);
    if (!epreuve) throw new NotFoundError('Épreuve');

    const existingRating = await this.epreuveRepository.getUserRating(userId, epreuveId);
    if (existingRating) {
      await EpreuveRating.findByIdAndUpdate(existingRating.id, { note });
    } else {
      await this.epreuveRepository.createRating({ userId, epreuveId, note });
    }
    await this.epreuveRepository.updateEpreuveRating(epreuveId);
  }

  async downloadEpreuve(id: string, type: 'epreuve' | 'corrige' = 'epreuve') {
    const epreuve = await this.epreuveRepository.findById(id);
    if (!epreuve) throw new NotFoundError('Épreuve');

    const url = type === 'epreuve' ? epreuve.urlPdf : epreuve.urlCorrigePdf;
    if (!url) throw new NotFoundError('Fichier');

    await this.epreuveRepository.incrementDownloads(id);

    const publicId = this.extractPublicIdFromUrl(url);
    return await this.storageService.getSignedUrl(publicId, 3600);
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
