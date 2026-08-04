import { IQuiz, IQuestion, IQuizResult, IQuizAnswer } from '../../../models/index';

export interface IQuizRepository {
  // Quiz
  findById(id: string): Promise<IQuiz | null>;
  listQuizzes(filters: any, options: any): Promise<{ quizzes: IQuiz[]; total: number }>;
  createQuiz(data: Partial<IQuiz>): Promise<IQuiz>;
  updateQuiz(id: string, data: Partial<IQuiz>): Promise<IQuiz>;
  deleteQuiz(id: string): Promise<void>;
  
  // Questions
  addQuestion(data: Partial<IQuestion>): Promise<IQuestion>;
  listQuestions(quizId: string): Promise<IQuestion[]>;
  deleteQuestion(id: string): Promise<void>;
  
  // Quiz Results
  createResult(data: Partial<IQuizResult>): Promise<IQuizResult>;
  listUserResults(userId: string, options: any): Promise<{ results: IQuizResult[]; total: number }>;
  getResultById(id: string): Promise<IQuizResult | null>;
  updateQuizResult(id: string, data: Partial<IQuizResult>): Promise<IQuizResult>;
  
  // Quiz Answers
  addAnswer(data: Partial<IQuizAnswer>): Promise<IQuizAnswer>;
  listAnswers(resultId: string): Promise<IQuizAnswer[]>;
}
