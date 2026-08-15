import {
  SupportTicket,
  SupportTicketStatus,
  User,
  UserStatus,
} from '../../models/index';
import { NotFoundError } from '../../shared/errors/index';
import { parsePagination, createPaginationMeta } from '../../shared/utils/pagination';

/**
 * Traitement des utilisateurs en difficulté.
 *
 * Deux entrées complémentaires :
 *  - le signalement explicite par l'étudiant (ticket depuis son profil) ;
 *  - la détection automatique des comptes en anomalie (verrouillés après PIN
 *    erronés, suspendus, bannis, ou dont l'email n'a jamais été vérifié).
 */
export class SupportService {
  // ── Côté étudiant ────────────────────────────────────────────────────────

  async createTicket(userId: string, data: { categorie?: string; sujet: string; message: string }) {
    return await SupportTicket.create({
      userId,
      categorie: data.categorie,
      sujet: data.sujet,
      message: data.message,
      status: SupportTicketStatus.OPEN,
    });
  }

  async listUserTickets(userId: string) {
    return await SupportTicket.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
  }

  // ── Côté administration ──────────────────────────────────────────────────

  async listTickets(filters: any) {
    const { page, limit } = parsePagination(filters);
    const query: any = {};
    if (filters.status) query.status = filters.status;

    const skip = (page - 1) * limit;
    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .populate({ path: 'userId', select: 'nom prenom email status niveau filiere' })
        .sort({ status: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupportTicket.countDocuments(query),
    ]);

    return { data: tickets, meta: createPaginationMeta(page, limit, total) };
  }

  async updateTicket(
    ticketId: string,
    adminId: string,
    data: { status?: string; reponseAdmin?: string },
  ) {
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) throw new NotFoundError('Ticket');

    if (data.status) ticket.status = data.status as SupportTicketStatus;
    if (data.reponseAdmin !== undefined) ticket.reponseAdmin = data.reponseAdmin;
    ticket.traiteParId = adminId;
    if (ticket.status === SupportTicketStatus.RESOLVED) ticket.resolvedAt = new Date();

    await ticket.save();
    return ticket;
  }

  async countOpenTickets(): Promise<number> {
    return await SupportTicket.countDocuments({ status: { $ne: SupportTicketStatus.RESOLVED } });
  }

  /**
   * Comptes en anomalie, détectés sans intervention de l'utilisateur.
   * C'est ce qui permet à l'administrateur de repérer un étudiant coincé même
   * s'il n'a jamais ouvert de ticket — typiquement, celui qui ne parvient plus
   * à se connecter et abandonne.
   */
  async listAccountsNeedingAttention() {
    const now = new Date();

    const [locked, suspended, unverified] = await Promise.all([
      User.find({ lockedUntil: { $gt: now } })
        .select('nom prenom email status failedPinAttempts lockedUntil lastFailedLoginAt')
        .sort({ lockedUntil: -1 })
        .limit(50)
        .lean(),
      User.find({ status: { $in: [UserStatus.SUSPENDED, UserStatus.BANNED] } })
        .select('nom prenom email status suspendedReason suspendedUntil')
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean(),
      // Inscription abandonnée : compte créé il y a plus d'un jour, email
      // jamais validé — l'OTP n'est probablement jamais arrivé.
      User.find({
        isEmailVerified: false,
        createdAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      })
        .select('nom prenom email createdAt')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ]);

    return {
      locked: locked.map(u => ({ ...u, raison: 'PIN bloqué' })),
      suspended: suspended.map(u => ({ ...u, raison: 'Compte suspendu ou banni' })),
      unverified: unverified.map(u => ({ ...u, raison: 'Email jamais vérifié' })),
      total: locked.length + suspended.length + unverified.length,
    };
  }

  /** Lève le verrouillage consécutif aux PIN erronés. */
  async unlockAccount(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('Utilisateur');

    await User.updateOne(
      { _id: userId },
      { $set: { failedPinAttempts: 0 }, $unset: { lockedUntil: 1 } },
    );

    return { id: user._id, message: 'Compte débloqué' };
  }
}
