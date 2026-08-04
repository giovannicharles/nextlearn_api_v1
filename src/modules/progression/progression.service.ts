import { IProgressionRepository } from './domain/progression.repository.interface';

export class ProgressionService {
  constructor(private progressionRepository: IProgressionRepository) {}

  async getStats(userId: string) {
    const stats = await this.progressionRepository.getStudyStats(userId);
    const streak = await this.progressionRepository.getStreak(userId);
    const docsLus = await this.progressionRepository.getDocsLusCount(userId);
    const matiereTop = await this.progressionRepository.getMatiereTop(userId);
    return {
      totalMinutes: Math.round(stats.totalDuration / 60),
      sessionCount: stats.totalSessions,
      streak,
      docsLus,
      matiereTop,
    };
  }

  async getStreak(userId: string) {
    return await this.progressionRepository.getStreak(userId);
  }

  async getWeekActivity(userId: string) {
    const activities = await this.progressionRepository.getWeekActivity(userId);
    return { activities };
  }

  async getMatiereActivity(userId: string) {
    const activities = await this.progressionRepository.getMatiereActivity(userId);
    return { activities };
  }

  async createStudySession(userId: string, documentId: string, dureeSecondes: number, pagesLues: number, date?: Date) {
    return await this.progressionRepository.createStudySession(userId, documentId, dureeSecondes, pagesLues, date);
  }

  async getBadges(userId: string) {
    return await this.progressionRepository.getBadges(userId);
  }

  async checkAndAwardBadges(userId: string) {
    const stats = await this.progressionRepository.getStudyStats(userId);
    const streak = await this.progressionRepository.getStreak(userId);

    // Badge pour 10 sessions
    if (stats.totalSessions >= 10) {
      await this.progressionRepository.awardBadge(userId, 'STUDENT_10', 'Étudiant Débutant', '10 sessions d\'étude complétées');
    }

    // Badge pour 50 sessions
    if (stats.totalSessions >= 50) {
      await this.progressionRepository.awardBadge(userId, 'STUDENT_50', 'Étudiant Avancé', '50 sessions d\'étude complétées');
    }

    // Badge pour 100 sessions
    if (stats.totalSessions >= 100) {
      await this.progressionRepository.awardBadge(userId, 'STUDENT_100', 'Étudiant Expert', '100 sessions d\'étude complétées');
    }

    // Badge pour streak de 7 jours (semaine_parfaite)
    if (streak >= 7) {
      await this.progressionRepository.awardBadge(userId, 'semaine_parfaite', 'Semaine Parfaite', '7 jours consécutifs d\'étude');
    }

    // Badge pour streak de 30 jours
    if (streak >= 30) {
      await this.progressionRepository.awardBadge(userId, 'STREAK_30', 'Mois Parfait', '30 jours consécutifs d\'étude');
    }

    // Badge pour 1000 pages lues
    if (stats.totalPagesRead >= 1000) {
      await this.progressionRepository.awardBadge(userId, 'READER_1000', 'Grand Lecteur', '1000 pages lues');
    }

    // Badge marathon (5h = 18000s en une session)
    if (stats.totalDuration >= 18000) {
      await this.progressionRepository.awardBadge(userId, 'marathon_5h', 'Marathon 5h', '5 heures d\'étude cumulées');
    }

    return await this.progressionRepository.getBadges(userId);
  }
}
