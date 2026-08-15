import { Request, Response } from 'express';
import { DocumentService } from './document.service';
import { createDocumentSchema, updateDocumentSchema, ratingSchema } from './dto/index';
import { successResponse } from '../../shared/http/response';
import { AuthRequest } from '../../middleware/auth.guard';

export class DocumentController {
  constructor(private documentService: DocumentService) {}

  async listDocuments(req: Request, res: Response): Promise<void> {
    const { page, limit, matiereId, niveau, type, search, universiteId, filiereId } = req.query;
    const filters = { matiereId, niveau, type, universiteId, filiereId };
    const options = { page: Number(page), limit: Number(limit) };

    if (search) {
      const result = await this.documentService.searchDocuments(search as string, options);
      successResponse(res, result.data, 200, result.meta);
    } else {
      const result = await this.documentService.listDocuments(filters, options);
      successResponse(res, result.data, 200, result.meta);
    }
  }

  async getDocumentById(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const userId = (req as AuthRequest).user?.id;
    const result = await this.documentService.getDocumentById(id, userId);
    successResponse(res, result);
  }

  async recordView(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    await this.documentService.incrementViews(id);
    successResponse(res, { message: 'Vue enregistrée' });
  }

  async downloadDocument(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const result = await this.documentService.downloadDocument(id);
    successResponse(res, result);
  }

  async getPopular(req: Request, res: Response): Promise<void> {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const result = await this.documentService.getPopular(limit);
    successResponse(res, result);
  }

  async getRecent(req: Request, res: Response): Promise<void> {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const result = await this.documentService.getRecent(limit);
    successResponse(res, result);
  }

  async getRecommended(req: AuthRequest, res: Response): Promise<void> {
    const limit = req.query.limit ? Number(req.query.limit) : 6;
    const universiteId = req.query.universiteId as string | undefined;
    const niveau = req.query.niveau as string | undefined;
    const result = await this.documentService.getRecommended(universiteId, niveau, limit);
    successResponse(res, result);
  }

  async searchDocuments(req: Request, res: Response): Promise<void> {
    const { q, page, limit } = req.query;
    const options = { page: Number(page) || 1, limit: Number(limit) || 20 };
    const result = await this.documentService.searchDocuments((q as string) || '', options);
    res.status(200).json({
      success: true,
      data: result.data,
      query: q,
      total: result.meta.total,
      meta: result.meta,
    });
  }

  async createDocument(req: Request, res: Response): Promise<void> {
    const validatedData = createDocumentSchema.parse(req.body);
    const file = (req as any).file;
    if (!file) throw new Error('File required');
    const result = await this.documentService.createDocument(validatedData, file.buffer);
    successResponse(res, result, 201);
  }

  async updateDocument(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const validatedData = updateDocumentSchema.parse(req.body ?? {});
    const file = (req as any).file;
    const result = await this.documentService.updateDocument(id, validatedData, file?.buffer);
    successResponse(res, result);
  }

  async deleteDocument(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    await this.documentService.deleteDocument(id);
    successResponse(res, { message: 'Document supprimé' });
  }

  async getSignedUrl(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const url = await this.documentService.getSignedUrl(id);
    successResponse(res, { url });
  }

  async rateDocument(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const id = String(req.params.id);
    const validatedData = ratingSchema.parse(req.body);
    await this.documentService.rateDocument(userId, id, validatedData.note);
    successResponse(res, { message: 'Note enregistrée' });
  }
}
