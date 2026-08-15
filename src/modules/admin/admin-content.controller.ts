import { Response } from 'express';
import { AdminContentService } from './admin-content.service';
import { successResponse } from '../../shared/http/response';
import { AuthRequest } from '../../middleware/auth.guard';

export class AdminContentController {
  constructor(private contentService: AdminContentService) {}

  // ==================== Documents ====================
  async listDocuments(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.contentService.listDocuments(req.query);
    successResponse(res, result.data, 200, result.meta);
  }

  async getDocument(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.contentService.getDocumentById(String(req.params.id));
    successResponse(res, result);
  }

  async toggleDocumentActive(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.contentService.toggleDocumentActive(String(req.params.id));
    successResponse(res, result);
  }

  async bulkDocumentAction(req: AuthRequest, res: Response): Promise<void> {
    const { action, ids } = req.body;
    const result = await this.contentService.bulkDocumentAction(action, ids);
    successResponse(res, result);
  }

  // ==================== Epreuves ====================
  async listEpreuves(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.contentService.listEpreuves(req.query);
    successResponse(res, result.data, 200, result.meta);
  }

  async getEpreuve(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.contentService.getEpreuveById(String(req.params.id));
    successResponse(res, result);
  }

  async toggleEpreuveActive(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.contentService.toggleEpreuveActive(String(req.params.id));
    successResponse(res, result);
  }

  async bulkEpreuveAction(req: AuthRequest, res: Response): Promise<void> {
    const { action, ids } = req.body;
    const result = await this.contentService.bulkEpreuveAction(action, ids);
    successResponse(res, result);
  }

  // ==================== Quiz ====================
  async listQuizzes(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.contentService.listQuizzes(req.query);
    successResponse(res, result.data, 200, result.meta);
  }

  async getQuiz(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.contentService.getQuizById(String(req.params.id));
    successResponse(res, result);
  }

  async getQuizWithQuestions(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.contentService.getQuizWithQuestions(String(req.params.id));
    successResponse(res, result);
  }

  async toggleQuizActive(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.contentService.toggleQuizActive(String(req.params.id));
    successResponse(res, result);
  }

  async bulkQuizAction(req: AuthRequest, res: Response): Promise<void> {
    const { action, ids } = req.body;
    const result = await this.contentService.bulkQuizAction(action, ids);
    successResponse(res, result);
  }

  async listQuestions(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.contentService.listQuestionsByQuiz(String(req.params.quizId));
    successResponse(res, result);
  }

  async updateQuestion(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.contentService.updateQuestion(String(req.params.id), req.body);
    successResponse(res, result);
  }

  // ==================== Enseignants ====================
  async listEnseignants(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.contentService.listEnseignants(req.query);
    successResponse(res, result.data, 200, result.meta);
  }

  async createEnseignant(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.contentService.createEnseignant(req.body);
    successResponse(res, result, 201);
  }

  async updateEnseignant(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.contentService.updateEnseignant(String(req.params.id), req.body);
    successResponse(res, result);
  }

  async deleteEnseignant(req: AuthRequest, res: Response): Promise<void> {
    await this.contentService.deleteEnseignant(String(req.params.id));
    successResponse(res, { message: 'Enseignant supprimé' });
  }

  // ==================== Content Overview ====================
  async contentOverview(_req: AuthRequest, res: Response): Promise<void> {
    const result = await this.contentService.contentOverview();
    successResponse(res, result);
  }
}
