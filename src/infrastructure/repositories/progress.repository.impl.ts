import { LectureProgress, StudySession } from '../../models/index';
import { IProgressRepository } from '../../modules/progress/domain/progress.repository.interface';

export class ProgressRepository implements IProgressRepository {
  async getLectureProgress(userId: string, documentId: string): Promise<any | null> {
    return await LectureProgress.findOne({ userId, documentId }).exec();
  }

  async updateLectureProgress(userId: string, documentId: string, data: Partial<any>): Promise<any> {
    const progress = await LectureProgress.findOneAndUpdate(
      { userId, documentId },
      { ...data, derniereLecture: new Date() },
      { upsert: true, new: true }
    ).exec();
    return progress;
  }

  async listUserProgress(userId: string, options: any): Promise<{ progress: any[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [progress, total] = await Promise.all([
      LectureProgress.find({ userId })
        .sort({ derniereLecture: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      LectureProgress.countDocuments({ userId }),
    ]);

    return { progress, total };
  }

  async createStudySession(data: Partial<any>): Promise<any> {
    return await StudySession.create(data);
  }

  async listStudySessions(userId: string, options: any): Promise<{ sessions: any[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      StudySession.find({ userId })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      StudySession.countDocuments({ userId }),
    ]);

    return { sessions, total };
  }

  async getStudyStats(userId: string): Promise<{ totalSessions: number; totalDuration: number; totalPagesRead: number }> {
    const stats = await StudySession.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalDuration: { $sum: '$dureeSecondes' },
          totalPagesRead: { $sum: '$pagesLues' },
        },
      },
    ]).exec();

    return stats[0] || { totalSessions: 0, totalDuration: 0, totalPagesRead: 0 };
  }
}
