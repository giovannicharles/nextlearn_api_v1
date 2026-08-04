import { Response } from 'express';
import { QuizService } from './quiz.service';
import { successResponse } from '../../shared/http/response';
import { AuthRequest } from '../../middleware/auth.guard';

export class QuizController {
  constructor(private quizService: QuizService) {}

  async listQuizzes(req: any, res: Response): Promise<void> {
    const { page, limit, matiereId, documentId } = req.query;
    const filters = { matiereId, documentId };
    const options = { page: Number(page), limit: Number(limit) };
    const result = await this.quizService.listQuizzes(filters, options);
    successResponse(res, result.data, 200, result.meta);
  }

  async getQuizById(req: any, res: Response): Promise<void> {
    const id = String(req.params.id);
    const result = await this.quizService.getQuizById(id);
    successResponse(res, result);
  }

  async createQuiz(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.quizService.createQuiz(req.body);
    successResponse(res, result, 201);
  }

  async updateQuiz(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const result = await this.quizService.updateQuiz(id, req.body);
    successResponse(res, result);
  }

  async deleteQuiz(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    await this.quizService.deleteQuiz(id);
    successResponse(res, { message: 'Quiz supprimé' });
  }

  async addQuestion(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.quizService.addQuestion(req.body);
    successResponse(res, result, 201);
  }

  async deleteQuestion(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    await this.quizService.deleteQuestion(id);
    successResponse(res, { message: 'Question supprimée' });
  }

  async submitQuiz(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const id = String(req.params.id);
    const { answers } = req.body;
    const result = await this.quizService.submitQuiz(userId, id, answers);
    successResponse(res, result, 201);
  }

  async listUserResults(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const { page, limit } = req.query;
    const result = await this.quizService.listUserResults(userId, { page: Number(page), limit: Number(limit) });
    successResponse(res, result.data, 200, result.meta);
  }

  async getResultById(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const result = await this.quizService.getResultById(id);
    successResponse(res, result);
  }
}
