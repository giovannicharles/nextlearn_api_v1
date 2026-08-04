import { StudySession, Badge, Document, Matiere } from '../../models/index';
import { IProgressionRepository } from '../../modules/progression/domain/progression.repository.interface';

export class ProgressionRepository implements IProgressionRepository {
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

  async getStreak(userId: string): Promise<number> {
    const sessions = await StudySession.find({ userId })
      .sort({ date: -1 })
      .limit(30)
      .exec();

    if (sessions.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const session of sessions) {
      const sessionDate = new Date(session.date);
      sessionDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === streak) {
        streak++;
        currentDate = new Date(sessionDate);
      } else if (diffDays > streak) {
        break;
      }
    }

    return streak;
  }

  async getBadges(userId: string): Promise<any[]> {
    return await Badge.find({ userId }).sort({ earnedAt: -1 }).exec();
  }

  async awardBadge(userId: string, type: string, titre: string, description: string): Promise<any> {
    const existing = await Badge.findOne({ userId, type }).exec();
    if (existing) return existing;

    return await Badge.create({
      userId,
      type,
      titre,
      description,
      earnedAt: new Date(),
    });
  }

  async getDocsLusCount(userId: string): Promise<number> {
    const result = await StudySession.distinct('documentId', { userId }).exec();
    return result.length;
  }

  async getMatiereTop(userId: string): Promise<string | null> {
    const sessions = await StudySession.find({ userId }).exec();
    if (sessions.length === 0) return null;

    const documentIds = [...new Set(sessions.map((s: any) => s.documentId))];
    const documents = await Document.find({ _id: { $in: documentIds } }).exec();

    const dureeByMatiere: Record<string, number> = {};
    for (const session of sessions as any[]) {
      const doc = documents.find((d: any) => d._id.toString() === session.documentId);
      if (!doc) continue;
      const matiereId = doc.matiereId?.toString();
      if (!matiereId) continue;
      dureeByMatiere[matiereId] = (dureeByMatiere[matiereId] || 0) + session.dureeSecondes;
    }

    const topMatiereId = Object.entries(dureeByMatiere).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!topMatiereId) return null;

    const matiere = await Matiere.findById(topMatiereId).exec();
    return matiere?.nom || null;
  }

  async getWeekActivity(userId: string): Promise<{ day: string; minutes: number }[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const sessions = await StudySession.find({
      userId,
      date: { $gte: sevenDaysAgo },
    }).exec();

    const minutesByDay: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      minutesByDay[key] = 0;
    }

    for (const session of sessions as any[]) {
      const key = new Date(session.date).toISOString().split('T')[0];
      if (key in minutesByDay) {
        minutesByDay[key] += Math.round(session.dureeSecondes / 60);
      }
    }

    return Object.entries(minutesByDay).map(([day, minutes]) => ({ day, minutes }));
  }

  async getMatiereActivity(userId: string): Promise<{ matiere: string; minutes: number }[]> {
    const sessions = await StudySession.find({ userId }).exec();
    if (sessions.length === 0) return [];

    const documentIds = [...new Set(sessions.map((s: any) => s.documentId))];
    const documents = await Document.find({ _id: { $in: documentIds } }).exec();
    const matiereIds = [...new Set(documents.map((d: any) => d.matiereId?.toString()).filter(Boolean))];
    const matieres = await Matiere.find({ _id: { $in: matiereIds } }).exec();

    const secondsByMatiere: Record<string, number> = {};
    for (const session of sessions as any[]) {
      const doc = documents.find((d: any) => d._id.toString() === session.documentId);
      if (!doc) continue;
      const matiereId = doc.matiereId?.toString();
      if (!matiereId) continue;
      secondsByMatiere[matiereId] = (secondsByMatiere[matiereId] || 0) + session.dureeSecondes;
    }

    return Object.entries(secondsByMatiere)
      .map(([matiereId, seconds]) => {
        const matiere = matieres.find((m: any) => m._id.toString() === matiereId);
        return { matiere: matiere?.nom || 'Inconnu', minutes: Math.round(seconds / 60) };
      })
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);
  }

  async createStudySession(userId: string, documentId: string, dureeSecondes: number, pagesLues: number, date?: Date): Promise<any> {
    return await StudySession.create({
      userId,
      documentId,
      dureeSecondes,
      pagesLues,
      date: date || new Date(),
    });
  }
}
