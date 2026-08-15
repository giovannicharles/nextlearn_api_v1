import { IQuizRepository } from './domain/quiz.repository.interface';
import { NotFoundError } from '../../shared/errors/index';
import { parsePagination, createPaginationMeta } from '../../shared/utils/pagination';

export class QuizService {
  constructor(private quizRepository: IQuizRepository) {}

  async listQuizzes(filters: any, options: any) {
    const { page, limit } = parsePagination(options);
    const { quizzes, total } = await this.quizRepository.listQuizzes(filters, { page, limit });
    return {
      data: quizzes,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getQuizById(id: string) {
    const quiz = await this.quizRepository.findById(id);
    if (!quiz) throw new NotFoundError('Quiz');
    const questions = await this.quizRepository.listQuestions(id);
    // On ne renvoie pas la bonne réponse avant soumission (elle n'est
    // dévoilée que dans la réponse de submitQuiz, voir plus bas).
    const safeQuestions = questions.map((q: any) => {
      const obj = q.toObject ? q.toObject() : q;
      const { bonneReponseIndex, explication, ...rest } = obj;
      return rest;
    });
    return { ...quiz.toObject(), questions: safeQuestions };
  }

  async createQuiz(data: any) {
    return await this.quizRepository.createQuiz(data);
  }

  async updateQuiz(id: string, data: any) {
    return await this.quizRepository.updateQuiz(id, data);
  }

  async deleteQuiz(id: string) {
    await this.quizRepository.deleteQuiz(id);
  }

  async addQuestion(data: any) {
    return await this.quizRepository.addQuestion(data);
  }

  async deleteQuestion(id: string) {
    await this.quizRepository.deleteQuestion(id);
  }

  async submitQuiz(userId: string, quizId: string, answers: any[], dureeSecondes: number = 0) {
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) throw new NotFoundError('Quiz');

    const questions = await this.quizRepository.listQuestions(quizId);
    let correctCount = 0;

    const quizResult = await this.quizRepository.createResult({
      userId,
      quizId,
      score: 0,
      totalQuestions: questions.length,
      dureeSecondes,
    } as any);

    const details: any[] = [];
    for (const answer of answers) {
      const question = questions.find((q: any) => String(q.id ?? q._id) === String(answer.questionId));
      if (question) {
        const bonneReponseIndex = (question as any).bonneReponseIndex;
        const isCorrect = bonneReponseIndex === answer.reponseIndex;
        if (isCorrect) correctCount++;
        await this.quizRepository.addAnswer({
          quizResultId: quizResult.id,
          questionId: answer.questionId,
          reponseIndex: answer.reponseIndex,
          estCorrect: isCorrect,
        } as any);
        details.push({
          questionId: answer.questionId,
          estCorrect: isCorrect,
          bonneReponseIndex,
          explication: (question as any).explication,
        });
      }
    }

    // score = nombre de bonnes réponses (cohérent avec totalQuestions, pas
    // un pourcentage — voir contrat documenté dans BACKEND_SPECIFICATION.md).
    const updatedResult = await this.quizRepository.updateQuizResult(quizResult.id, { score: correctCount } as any);

    return { ...updatedResult.toObject(), details };
  }

  async listUserResults(userId: string, options: any) {
    const { page, limit } = parsePagination(options);
    const { results, total } = await this.quizRepository.listUserResults(userId, { page, limit });
    return {
      data: results,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getResultById(id: string) {
    const result = await this.quizRepository.getResultById(id);
    if (!result) throw new NotFoundError('Résultat');
    const answers = await this.quizRepository.listAnswers(id);
    return { ...result.toObject(), answers };
  }
}
