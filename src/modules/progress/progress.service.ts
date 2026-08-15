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
    const { date, ...rest } = data ?? {};
    return await this.progressRepository.createStudySession({
      userId,
      ...rest,
      date: this.resolveSessionDate(date),
    });
  }

  /**
   * Date d'une session de lecture.
   *
   * Le client transmet la date réelle de lecture, indispensable pour qu'une
   * session enregistrée hors ligne et envoyée plus tard soit comptée le bon
   * jour dans les statistiques hebdomadaires.
   *
   * Elle est bornée pour ne pas devenir un vecteur de triche : jamais dans le
   * futur, jamais au-delà de la fenêtre de rattrapage. Hors de ces bornes, ou
   * absente, on retombe sur l'heure serveur.
   */
  private resolveSessionDate(raw: unknown): Date {
    const now = new Date();
    if (!raw) return now;

    const parsed = new Date(raw as string);
    if (Number.isNaN(parsed.getTime())) return now;

    const maxBacklogMs = 7 * 24 * 60 * 60 * 1000;
    if (parsed > now || now.getTime() - parsed.getTime() > maxBacklogMs) return now;

    return parsed;
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
