import { Quiz, Question, QuizResult, QuizAnswer } from '../../models/index';
import { IQuizRepository } from '../../modules/quiz/domain/quiz.repository.interface';
import { NotFoundError } from '../../shared/errors/index';

export class QuizRepository implements IQuizRepository {
  // Quiz
  async findById(id: string): Promise<any | null> {
    return await Quiz.findById(id).exec();
  }

  async listQuizzes(filters: any, options: any): Promise<{ quizzes: any[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const query: any = { actif: true };
    if (filters.matiereId) query.matiereId = filters.matiereId;
    if (filters.documentId) query.documentId = filters.documentId;

    const [quizzes, total] = await Promise.all([
      Quiz.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Quiz.countDocuments(query),
    ]);

    return { quizzes, total };
  }

  async createQuiz(data: Partial<any>): Promise<any> {
    return await Quiz.create(data);
  }

  async updateQuiz(id: string, data: Partial<any>): Promise<any> {
    const quiz = await Quiz.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!quiz) throw new NotFoundError('Quiz');
    return quiz;
  }

  async deleteQuiz(id: string): Promise<void> {
    const quiz = await Quiz.findByIdAndUpdate(id, { actif: false }).exec();
    if (!quiz) throw new NotFoundError('Quiz');
  }

  // Questions
  async addQuestion(data: Partial<any>): Promise<any> {
    return await Question.create(data);
  }

  async listQuestions(quizId: string): Promise<any[]> {
    return await Question.find({ quizId }).sort({ ordre: 1 }).exec();
  }

  async deleteQuestion(id: string): Promise<void> {
    const question = await Question.findByIdAndDelete(id).exec();
    if (!question) throw new NotFoundError('Question');
  }

  // Quiz Results
  async createResult(data: Partial<any>): Promise<any> {
    return await QuizResult.create(data);
  }

  async listUserResults(userId: string, options: any): Promise<{ results: any[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      QuizResult.find({ userId })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      QuizResult.countDocuments({ userId }),
    ]);

    return { results, total };
  }

  async getResultById(id: string): Promise<any | null> {
    return await QuizResult.findById(id).exec();
  }

  async updateQuizResult(id: string, data: Partial<any>): Promise<any> {
    const result = await QuizResult.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!result) throw new NotFoundError('Résultat');
    return result;
  }

  // Quiz Answers
  async addAnswer(data: Partial<any>): Promise<any> {
    return await QuizAnswer.create(data);
  }

  async listAnswers(resultId: string): Promise<any[]> {
    return await QuizAnswer.find({ quizResultId: resultId }).exec();
  }
}
