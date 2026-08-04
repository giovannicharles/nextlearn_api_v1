import { ILectureProgress, IStudySession } from '../../../models/index';

export interface IProgressRepository {
  // Lecture Progress
  getLectureProgress(userId: string, documentId: string): Promise<ILectureProgress | null>;
  updateLectureProgress(userId: string, documentId: string, data: Partial<ILectureProgress>): Promise<ILectureProgress>;
  listUserProgress(userId: string, options: any): Promise<{ progress: ILectureProgress[]; total: number }>;
  
  // Study Sessions
  createStudySession(data: Partial<IStudySession>): Promise<IStudySession>;
  listStudySessions(userId: string, options: any): Promise<{ sessions: IStudySession[]; total: number }>;
  getStudyStats(userId: string): Promise<{ totalSessions: number; totalDuration: number; totalPagesRead: number }>;
}
