import { IProgressRepository } from './domain/progress.repository.interface';
import { parsePagination, createPaginationMeta } from '../../shared/utils/pagination';

export class ProgressService {
  constructor(private progressRepository: IProgressRepository) {}

  async getLectureProgress(userId: string, documentId: string) {
    return await this.progressRepository.getLectureProgress(userId, documentId);
  }

  async updateLectureProgress(userId: string, documentId: string, data: any) {
    return await this.progressRepository.updateLectureProgress(userId, documentId, data);
  }

  async listUserProgress(userId: string, options: any) {
    const { page, limit } = parsePagination(options);
    const { progress, total } = await this.progressRepository.listUserProgress(userId, { page, limit });
    return {
      data: progress,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async createStudySession(userId: string, data: any) {
    return await this.progressRepository.createStudySession({
      userId,
      ...data,
      date: new Date(),
    });
  }

  async listStudySessions(userId: string, options: any) {
    const { page, limit } = parsePagination(options);
    const { sessions, total } = await this.progressRepository.listStudySessions(userId, { page, limit });
    return {
      data: sessions,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getStudyStats(userId: string) {
    return await this.progressRepository.getStudyStats(userId);
  }
}
