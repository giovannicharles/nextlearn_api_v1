import { IStudySession, IBadge } from '../../../models/index';
import { StreakResult } from '../../../shared/utils/streak';

export interface IProgressionRepository {
  getStudyStats(userId: string): Promise<{ totalSessions: number; totalDuration: number; totalPagesRead: number }>;
  getStreak(userId: string): Promise<number>;
  getStreakDetail(userId: string): Promise<StreakResult>;
  getBadges(userId: string): Promise<IBadge[]>;
  awardBadge(userId: string, type: string, titre: string, description: string): Promise<IBadge>;
  getDocsLusCount(userId: string): Promise<number>;
  getMatiereTop(userId: string): Promise<string | null>;
  getWeekActivity(userId: string): Promise<{ day: string; minutes: number }[]>;
  getMatiereActivity(userId: string): Promise<{ matiere: string; minutes: number }[]>;
  createStudySession(userId: string, documentId: string, dureeSecondes: number, pagesLues: number, date?: Date): Promise<IStudySession>;
}
