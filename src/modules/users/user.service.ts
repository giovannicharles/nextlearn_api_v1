import bcrypt from 'bcryptjs';
import { IUserRepository } from './domain/user.repository.interface';
import { NotFoundError, UnauthorizedError, ForbiddenError, ConflictError } from '../../shared/errors/index';
import { UserResponse } from '../auth/domain/auth.types';
import { StudySession, OfflineDownload, LectureProgress, User, UserStatus, Document, Epreuve, Quiz, Universite, Filiere, Matiere, Notification } from '../../models/index';
import { activityLogService } from '../admin/activity-log.service';
import { resolveUniversiteId, resolveFiliereId, resolveAcademicRefs } from '../../shared/utils/academic-refs';

export class UserService {
  constructor(private userRepository: IUserRepository) {}

  async getProfile(userId: string): Promise<UserResponse> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) throw new NotFoundError('Utilisateur');
    return this.formatUser(user);
  }

  async getProfileWithStats(userId: string): Promise<any> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) throw new NotFoundError('Utilisateur');

    const [sessions, downloads, lectureProgress] = await Promise.all([
      StudySession.find({ userId }).exec(),
      OfflineDownload.find({ userId }).exec(),
      LectureProgress.find({ userId }).exec(),
    ]);

    const totalSeconds = sessions.reduce((sum, s) => sum + (s.dureeSecondes || 0), 0);
    const heuresEtude = Math.round((totalSeconds / 3600) * 10) / 10;
    const docsLus = new Set(lectureProgress.map((p) => p.documentId)).size;
    const docsTelecharges = downloads.length;

    const studyDays = new Set(sessions.map((s) => new Date(s.date).toDateString()));
    const sortedDays = Array.from(studyDays).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < sortedDays.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      if (new Date(sortedDays[i]).getTime() === expected.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return {
      user: this.formatUser(user),
      stats: {
        docsTelecharges,
        docsLus,
        heuresEtude,
        streak,
      },
    };
  }

  async updateProfile(userId: string, data: any): Promise<UserResponse> {
    // Changer d'université ou de filière doit re-résoudre les id de ciblage,
    // sinon l'utilisateur continuerait de recevoir les notifications de son
    // ancien parcours.
    const payload = { ...data, ...(await this.resolveRefsIfChanged(data)) };
    const user = await this.userRepository.updateUser(userId, payload);
    return this.formatUser(user);
  }

  /** Recalcule universiteId/filiereId quand le nom correspondant change. */
  private async resolveRefsIfChanged(data: any): Promise<Record<string, string | undefined>> {
    if (data.universite === undefined && data.filiere === undefined) return {};
    const refs: Record<string, string | undefined> = {};
    if (data.universite !== undefined) refs.universiteId = await resolveUniversiteId(data.universite);
    if (data.filiere !== undefined) refs.filiereId = await resolveFiliereId(data.filiere);
    return refs;
  }

  async updateLanguage(userId: string, langue: string): Promise<UserResponse> {
    const user = await this.userRepository.updateUser(userId, { langue: langue as any });
    return this.formatUser(user);
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<UserResponse> {
    const user = await this.userRepository.updateUser(userId, { avatarUrl });
    return this.formatUser(user);
  }

  async changePin(userId: string, currentPin: string, newPin: string): Promise<void> {
    const user = await this.userRepository.findUserById(userId);
    if (!user || !user.pinHash) {
      throw new NotFoundError('Utilisateur');
    }

    const isValidPin = await bcrypt.compare(currentPin, user.pinHash);
    if (!isValidPin) {
      throw new UnauthorizedError('PIN actuel incorrect');
    }

    const newPinHash = await bcrypt.hash(newPin, 12);
    await this.userRepository.updateUser(userId, { pinHash: newPinHash });
  }

  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.userRepository.updateUser(userId, { fcmToken });
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.userRepository.deleteUser(userId);
  }

  async listUsers(options: any): Promise<{ users: UserResponse[]; total: number }> {
    const { users, total } = await this.userRepository.listUsers({}, options);
    return {
      users: users.map((u) => this.formatUser(u)),
      total,
    };
  }

  private formatUser(user: any): UserResponse {
    return {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      universite: user.universite,
      filiere: user.filiere,
      niveau: user.niveau,
      langue: user.langue,
      role: user.role || 'user',
      status: user.status || 'active',
      avatarUrl: user.avatarUrl || null,
      isPremium: user.isPremium || false,
    };
  }

  async adminListUsers(filters: any): Promise<any> {
    const { page = 1, limit = 20, search, role, status, classe } = filters;
    const query: any = {};
    if (role) query.role = role.toLowerCase();
    if (status) query.status = status;
    if (classe) query.niveau = classe;
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { nom: { $regex: search, $options: 'i' } },
        { prenom: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query).select('-pinHash').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(query),
    ]);
    return {
      users: users.map(u => ({
        // `_id` en plus de `id` : l'admin web cible les utilisateurs par `_id`
        // (comme pour toutes les autres ressources) et recevait donc undefined
        // — modifier, bloquer, supprimer et changer de rôle échouaient tous.
        _id: u._id,
        id: u._id,
        email: u.email,
        nom: u.nom,
        prenom: u.prenom,
        universite: u.universite,
        filiere: u.filiere,
        niveau: u.niveau,
        role: u.role,
        status: u.status,
        isPremium: u.isPremium,
        isEmailVerified: u.isEmailVerified,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        suspendedReason: u.suspendedReason,
        suspendedUntil: u.suspendedUntil,
      })),
      total,
      page: Number(page),
      limit: Number(limit),
      // Absent de la réponse : la pagination de l'admin retombait sur 1 seule
      // page, rendant les utilisateurs au-delà du 20ᵉ inatteignables.
      pages: Math.max(1, Math.ceil(total / Number(limit))),
    };
  }

  async adminUpdateUserRole(userId: string, newRole: string): Promise<any> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('Utilisateur');
    user.role = newRole.toLowerCase();
    await user.save();
    return { id: user._id, role: user.role };
  }

  async adminSuspendUser(userId: string, reason: string, untilDate?: Date): Promise<any> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('Utilisateur');
    user.status = UserStatus.SUSPENDED;
    user.suspendedReason = reason;
    user.suspendedUntil = untilDate;
    await user.save();
    return { id: user._id, status: user.status, suspendedReason: user.suspendedReason, suspendedUntil: user.suspendedUntil };
  }

  async adminBanUser(userId: string, reason: string): Promise<any> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('Utilisateur');
    user.status = UserStatus.BANNED;
    user.suspendedReason = reason;
    await user.save();
    return { id: user._id, status: user.status, suspendedReason: user.suspendedReason };
  }

  async adminActivateUser(userId: string): Promise<any> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('Utilisateur');
    user.status = UserStatus.ACTIVE;
    user.suspendedReason = undefined;
    user.suspendedUntil = undefined;
    await user.save();
    return { id: user._id, status: user.status };
  }

  async adminTogglePremium(userId: string): Promise<any> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('Utilisateur');
    user.isPremium = !user.isPremium;
    await user.save();
    return { id: user._id, isPremium: user.isPremium };
  }

  /**
   * Création d'un compte par un administrateur.
   *
   * L'opération manquait complètement : le CRUD utilisateur n'avait pas de « C ».
   * Le compte est créé sans PIN — l'authentification étant PIN + OTP, c'est à
   * l'étudiant de définir le sien via le lien de réinitialisation. L'email est
   * marqué vérifié puisque c'est un administrateur qui l'a saisi.
   */
  async adminCreateUser(data: any): Promise<any> {
    const email = String(data.email || '').toLowerCase().trim();
    if (!email) throw new NotFoundError('Email');

    const existing = await User.findOne({ email }).lean();
    if (existing) throw new ConflictError('Un compte avec cet email existe déjà');

    const refs = await resolveAcademicRefs(data.universite, data.filiere);

    const user = await User.create({
      email,
      nom: data.nom,
      prenom: data.prenom,
      universite: data.universite,
      filiere: data.filiere,
      ...refs,
      niveau: data.niveau,
      role: (data.role || 'user').toLowerCase(),
      isEmailVerified: true,
    });

    return this.formatUser(user);
  }

  async adminUpdateUser(userId: string, data: any): Promise<any> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('Utilisateur');
    const allowed = ['nom', 'prenom', 'filiere', 'niveau', 'universite'];
    for (const key of allowed) {
      if (data[key] !== undefined) (user as any)[key] = data[key];
    }
    // Même contrainte que updateProfile : garder les id de ciblage alignés
    // sur les noms que l'admin vient de modifier.
    const refs = await this.resolveRefsIfChanged(data);
    for (const [key, value] of Object.entries(refs)) (user as any)[key] = value;
    await user.save();
    return this.formatUser(user);
  }

  async adminDeleteUser(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('Utilisateur');
    if (user.role === 'admin') {
      throw new ForbiddenError('Impossible de supprimer un administrateur');
    }
    await User.deleteOne({ _id: userId });
  }

  async adminGetStats(): Promise<any> {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dayGroup = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };

    const [
      totalUsers, activeUsers, suspendedUsers, bannedUsers, adminCount, premiumCount, verifiedCount,
      totalDocuments, totalEpreuves, totalQuiz, totalUniversites, totalFilieres, totalMatieres,
      totalNotifications, newUsersThisWeek, newDocumentsThisWeek, newUsersThisMonth, newUsersToday,
      docsByType, docsByLevel, usersByClasse, userGrowthRaw, docGrowthRaw, recentActivities,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'suspended' }),
      User.countDocuments({ status: 'banned' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ isPremium: true }),
      User.countDocuments({ isEmailVerified: true }),
      Document.countDocuments(),
      Epreuve.countDocuments(),
      Quiz.countDocuments(),
      Universite.countDocuments(),
      Filiere.countDocuments(),
      Matiere.countDocuments(),
      Notification.countDocuments(),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      Document.countDocuments({ createdAt: { $gte: weekAgo } }),
      User.countDocuments({ createdAt: { $gte: monthStart } }),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      Document.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Document.aggregate([{ $group: { _id: '$niveau', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      User.aggregate([{ $group: { _id: '$niveau', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      User.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: dayGroup, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Document.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: dayGroup, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      activityLogService.recent(8),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        banned: bannedUsers,
        locked: suspendedUsers + bannedUsers,
        admins: adminCount,
        premium: premiumCount,
        verified: verifiedCount,
        newThisWeek: newUsersThisWeek,
        month: newUsersThisMonth,
        today: newUsersToday,
      },
      documents: {
        total: totalDocuments,
        week: newDocumentsThisWeek,
        byType: docsByType,
        byLevel: docsByLevel,
      },
      content: {
        documents: totalDocuments,
        epreuves: totalEpreuves,
        quiz: totalQuiz,
        newDocumentsThisWeek,
      },
      references: {
        universites: totalUniversites,
        filieres: totalFilieres,
        matieres: totalMatieres,
      },
      notifications: totalNotifications,
      usersByClasse,
      charts: {
        userGrowth: userGrowthRaw,
        docGrowth: docGrowthRaw,
      },
      recentActivities,
    };
  }

  async adminGetUserDetail(userId: string): Promise<any> {
    const user = await User.findById(userId).select('-pinHash').lean();
    if (!user) throw new NotFoundError('Utilisateur');

    const [sessions, downloads, lectureProgress, quizResults, favorites] = await Promise.all([
      StudySession.find({ userId }).sort({ date: -1 }).limit(50).lean(),
      OfflineDownload.find({ userId }).lean(),
      LectureProgress.find({ userId }).countDocuments(),
      (await import('../../models/index')).QuizResult.find({ userId }).lean(),
      (await import('../../models/index')).Favorite.find({ userId }).countDocuments(),
    ]);

    const totalSeconds = sessions.reduce((sum, s) => sum + (s.dureeSecondes || 0), 0);
    const heuresEtude = Math.round((totalSeconds / 3600) * 10) / 10;

    return {
      user: {
        id: user._id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        universite: user.universite,
        filiere: user.filiere,
        niveau: user.niveau,
        langue: user.langue,
        role: user.role,
        status: user.status,
        isPremium: user.isPremium,
        isEmailVerified: user.isEmailVerified,
        avatarUrl: user.avatarUrl,
        lastLoginAt: user.lastLoginAt,
        suspendedReason: user.suspendedReason,
        suspendedUntil: user.suspendedUntil,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      stats: {
        heuresEtude,
        sessionsCount: sessions.length,
        downloadsCount: downloads.length,
        documentsRead: lectureProgress,
        quizCompleted: quizResults.length,
        favoritesCount: favorites,
      },
      recentSessions: sessions.slice(0, 10),
    };
  }

  async adminGetReports(periodDays: number): Promise<any> {
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const dayGroup = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };

    const [
      userGrowth, docGrowth, docsByType, docsByLevel, usersByRole, topSubjectsRaw, topAuthorsRaw,
    ] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: dayGroup, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Document.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: dayGroup, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Document.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Document.aggregate([{ $group: { _id: '$niveau', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Document.aggregate([
        { $group: { _id: '$matiereId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Document.aggregate([
        { $match: { enseignantId: { $ne: null } } },
        { $group: { _id: '$enseignantId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const matiereIds = topSubjectsRaw.map((s: any) => s._id).filter(Boolean);
    const enseignantIds = topAuthorsRaw.map((a: any) => a._id).filter(Boolean);
    const [matieres, enseignants] = await Promise.all([
      Matiere.find({ _id: { $in: matiereIds } }).lean(),
      (await import('../../models/index')).Enseignant.find({ _id: { $in: enseignantIds } }).lean(),
    ]);
    const matiereNames = new Map(matieres.map((m: any) => [String(m._id), m.nom]));
    const enseignantNames = new Map(enseignants.map((e: any) => [String(e._id), e.nom]));

    return {
      userGrowth,
      docGrowth,
      docsByType,
      docsByLevel,
      usersByRole,
      topSubjects: topSubjectsRaw.map((s: any) => ({ _id: matiereNames.get(String(s._id)) || 'Matière inconnue', count: s.count })),
      topAuthors: topAuthorsRaw.map((a: any) => ({ _id: enseignantNames.get(String(a._id)) || 'Auteur inconnu', count: a.count })),
    };
  }

  async adminBulkAction(action: string, userIds: string[], reason?: string): Promise<any> {
    if (!userIds || userIds.length === 0) {
      throw new Error('Aucun utilisateur sélectionné');
    }

    let result;
    switch (action) {
      case 'activate':
        result = await User.updateMany(
          { _id: { $in: userIds }, role: { $ne: 'admin' } },
          { $set: { status: 'active', suspendedReason: undefined, suspendedUntil: undefined } }
        );
        break;
      case 'suspend':
        result = await User.updateMany(
          { _id: { $in: userIds }, role: { $ne: 'admin' } },
          { $set: { status: 'suspended', suspendedReason: reason || 'Action en masse' } }
        );
        break;
      case 'ban':
        result = await User.updateMany(
          { _id: { $in: userIds }, role: { $ne: 'admin' } },
          { $set: { status: 'banned', suspendedReason: reason || 'Bannissement en masse' } }
        );
        break;
      case 'premium':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { $set: { isPremium: true } }
        );
        break;
      case 'unpremium':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { $set: { isPremium: false } }
        );
        break;
      default:
        throw new Error(`Action non reconnue: ${action}`);
    }
    return { action, affected: result.modifiedCount, total: userIds.length };
  }
}
