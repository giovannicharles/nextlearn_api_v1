import {
  VerificationRequest,
  VerificationStatus,
  VerificationAuditLog,
  OPEN_VERIFICATION_STATUSES,
  User,
  Role,
  Notification,
  NotificationType,
} from '../../models/index';
import { StorageService } from '../../infrastructure/storage/storage.interface';
import { MailerService } from '../../infrastructure/mailer/mailer.interface';
import { NotFoundError, ForbiddenError } from '../../shared/errors/index';
import { parsePagination, createPaginationMeta } from '../../shared/utils/pagination';
import { MOTIFS_REJET, MAX_RESUBMISSIONS, SLA_HOURS } from '../../shared/constants/verification';
import env from '../../config/env';

/**
 * Transitions autorisées de la machine à états.
 *
 * Centralisées ici plutôt que dispersées dans les méthodes : une transition
 * non prévue est refusée explicitement, ce qui évite qu'un dossier déjà tranché
 * soit re-décidé par un second admin qui aurait la page ouverte.
 */
const ALLOWED_TRANSITIONS: Record<string, VerificationStatus[]> = {
  [VerificationStatus.EN_ATTENTE]: [
    VerificationStatus.EN_REVUE,
    VerificationStatus.APPROUVE,
    VerificationStatus.REJETE,
    VerificationStatus.INFOS_COMPLEMENTAIRES_REQUISES,
  ],
  [VerificationStatus.EN_REVUE]: [
    VerificationStatus.APPROUVE,
    VerificationStatus.REJETE,
    VerificationStatus.INFOS_COMPLEMENTAIRES_REQUISES,
    VerificationStatus.EN_ATTENTE,
  ],
  [VerificationStatus.INFOS_COMPLEMENTAIRES_REQUISES]: [
    VerificationStatus.EN_REVUE,
    VerificationStatus.REJETE,
    VerificationStatus.APPROUVE,
  ],
  // Statuts terminaux : seule une resoumission de l'étudiant crée un nouveau
  // dossier, on ne réécrit jamais une décision passée.
  [VerificationStatus.APPROUVE]: [],
  [VerificationStatus.REJETE]: [],
};

export class VerificationAdminService {
  constructor(
    private storageService: StorageService,
    private mailerService: MailerService,
  ) {}

  // ── File de traitement ───────────────────────────────────────────────────

  async listRequests(filters: any) {
    const { page, limit } = parsePagination(filters);
    const query: any = {};

    if (filters.statut) query.statut = filters.statut;
    if (filters.universiteId) query.universiteId = filters.universiteId;
    if (filters.filiereId) query.filiereId = filters.filiereId;
    if (filters.niveau) query.niveau = filters.niveau;
    if (filters.suspect === 'true') query.suspect = true;
    if (filters.enRetard === 'true') {
      query.slaDueAt = { $lt: new Date() };
      query.statut = { $in: OPEN_VERIFICATION_STATUSES };
    }
    if (filters.assigneAId) query.assigneAId = filters.assigneAId;

    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      VerificationRequest.find(query)
        .populate({ path: 'userId', select: 'nom prenom email createdAt' })
        .populate({ path: 'universiteId', select: 'nom' })
        .populate({ path: 'filiereId', select: 'nom' })
        .populate({ path: 'assigneAId', select: 'nom prenom' })
        // Les suspects et les dossiers en retard remontent en tête.
        .sort({ suspect: -1, submittedAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      VerificationRequest.countDocuments(query),
    ]);

    const now = Date.now();
    const data = requests.map((r: any) => ({
      ...r,
      justificatifPublicId: undefined, // jamais exposé dans la liste
      enRetard:
        OPEN_VERIFICATION_STATUSES.includes(r.statut) && new Date(r.slaDueAt).getTime() < now,
    }));

    return { data, meta: createPaginationMeta(page, limit, total) };
  }

  async getRequestDetail(requestId: string) {
    const request = await VerificationRequest.findById(requestId)
      .populate({ path: 'userId', select: 'nom prenom email createdAt verificationStatus' })
      .populate({ path: 'universiteId', select: 'nom' })
      .populate({ path: 'filiereId', select: 'nom' })
      .populate({ path: 'assigneAId', select: 'nom prenom' })
      .lean();

    if (!request) throw new NotFoundError('Dossier');

    const historique = await VerificationAuditLog.find({ requestId })
      .sort({ createdAt: -1 })
      .lean();

    return {
      ...request,
      justificatifPublicId: undefined,
      justificatifDisponible: Boolean((request as any).justificatifPublicId),
      historique,
      motifsDisponibles: MOTIFS_REJET,
    };
  }

  /**
   * URL signée et temporaire du justificatif, pour la visionneuse admin.
   *
   * C'est le seul chemin d'accès au fichier : il est stocké en privé sur
   * Cloudinary et la route qui appelle cette méthode est réservée aux
   * réviseurs. Chaque consultation est journalisée.
   */
  async getJustificatifUrl(requestId: string, adminId: string, ip?: string) {
    const request = await VerificationRequest.findById(requestId);
    if (!request) throw new NotFoundError('Dossier');

    if (!request.justificatifPublicId) {
      throw new NotFoundError('Justificatif (purgé après le délai de rétention)');
    }

    const url = await this.storageService.getSignedUrl(request.justificatifPublicId, 600);

    await VerificationAuditLog.create({
      requestId,
      userId: request.userId,
      adminId,
      action: 'JUSTIFICATIF_CONSULTE',
      ip,
    });

    return { url, expiresInSeconds: 600 };
  }

  // ── Transitions ──────────────────────────────────────────────────────────

  /** Ouverture du dossier par un réviseur : passe en revue et se l'assigne. */
  async takeReview(requestId: string, adminId: string, ip?: string) {
    const request = await this.assertTransition(requestId, VerificationStatus.EN_REVUE);

    const ancienStatut = request.statut;
    request.statut = VerificationStatus.EN_REVUE;
    request.assigneAId = request.assigneAId || adminId;
    request.firstReviewedAt = request.firstReviewedAt || new Date();
    await request.save();

    await this.log(request, adminId, 'PRISE_EN_CHARGE', ancienStatut, ip);
    return request;
  }

  async assign(requestId: string, adminId: string, cibleAdminId: string, ip?: string) {
    const request = await VerificationRequest.findById(requestId);
    if (!request) throw new NotFoundError('Dossier');

    request.assigneAId = cibleAdminId;
    await request.save();

    await this.log(request, adminId, 'ASSIGNE', request.statut, ip, `Assigné à ${cibleAdminId}`);
    return request;
  }

  async approve(requestId: string, adminId: string, ip?: string) {
    const request = await this.assertTransition(requestId, VerificationStatus.APPROUVE);
    const ancienStatut = request.statut;

    request.statut = VerificationStatus.APPROUVE;
    request.decidedAt = new Date();
    request.assigneAId = request.assigneAId || adminId;
    await request.save();

    // C'est ce champ qui débloque l'accès au contenu (verifiedGuard).
    await User.updateOne(
      { _id: request.userId },
      { $set: { verificationStatus: VerificationStatus.APPROUVE } },
    );

    await this.log(request, adminId, 'APPROUVE', ancienStatut, ip);
    await this.notifyDecision(request, 'approuve');
    return request;
  }

  async reject(
    requestId: string,
    adminId: string,
    motifCode: string,
    motifTexte: string | undefined,
    ip?: string,
  ) {
    const motif = MOTIFS_REJET.find(m => m.code === motifCode);
    if (!motif) throw new NotFoundError('Motif de rejet');
    if (motif.texteObligatoire && !motifTexte?.trim()) {
      throw new ForbiddenError('Ce motif exige une explication écrite.');
    }

    const request = await this.assertTransition(requestId, VerificationStatus.REJETE);
    const ancienStatut = request.statut;

    request.statut = VerificationStatus.REJETE;
    request.motifRejetCode = motifCode;
    request.motifRejetTexte = motifTexte;
    request.decidedAt = new Date();
    request.assigneAId = request.assigneAId || adminId;
    await request.save();

    await User.updateOne(
      { _id: request.userId },
      { $set: { verificationStatus: VerificationStatus.REJETE } },
    );

    await this.log(request, adminId, 'REJETE', ancienStatut, ip, `${motif.label}${motifTexte ? ` — ${motifTexte}` : ''}`);
    await this.notifyDecision(request, 'rejete', motif.label, motifTexte);
    return request;
  }

  /** Demande de complément : ni approbation ni rejet, la main repasse à l'étudiant. */
  async requestMoreInfo(requestId: string, adminId: string, message: string, ip?: string) {
    if (!message?.trim()) {
      throw new ForbiddenError('Un message expliquant le complément attendu est requis.');
    }

    const request = await this.assertTransition(
      requestId,
      VerificationStatus.INFOS_COMPLEMENTAIRES_REQUISES,
    );
    const ancienStatut = request.statut;

    request.statut = VerificationStatus.INFOS_COMPLEMENTAIRES_REQUISES;
    request.messageComplement = message;
    request.assigneAId = request.assigneAId || adminId;
    await request.save();

    await User.updateOne(
      { _id: request.userId },
      { $set: { verificationStatus: VerificationStatus.INFOS_COMPLEMENTAIRES_REQUISES } },
    );

    await this.log(request, adminId, 'COMPLEMENT_DEMANDE', ancienStatut, ip, message);
    await this.notifyDecision(request, 'complement', undefined, message);
    return request;
  }

  /** Traitement groupé — même contrôle de transition dossier par dossier. */
  async bulk(
    requestIds: string[],
    adminId: string,
    action: 'approve' | 'reject',
    motifCode?: string,
    motifTexte?: string,
    ip?: string,
  ) {
    const resultats: { id: string; ok: boolean; erreur?: string }[] = [];

    for (const id of requestIds) {
      try {
        if (action === 'approve') {
          await this.approve(id, adminId, ip);
        } else {
          await this.reject(id, adminId, motifCode!, motifTexte, ip);
        }
        resultats.push({ id, ok: true });
      } catch (error: any) {
        resultats.push({ id, ok: false, erreur: error?.message || 'Erreur' });
      }
    }

    return {
      traites: resultats.filter(r => r.ok).length,
      echecs: resultats.filter(r => !r.ok),
    };
  }

  // ── Suivi de charge ──────────────────────────────────────────────────────

  async getStats() {
    const now = new Date();

    const [parStatut, enRetard, suspects, decides] = await Promise.all([
      VerificationRequest.aggregate([{ $group: { _id: '$statut', total: { $sum: 1 } } }]),
      VerificationRequest.countDocuments({
        statut: { $in: OPEN_VERIFICATION_STATUSES },
        slaDueAt: { $lt: now },
      }),
      VerificationRequest.countDocuments({
        suspect: true,
        statut: { $in: OPEN_VERIFICATION_STATUSES },
      }),
      VerificationRequest.find({ decidedAt: { $ne: null } })
        .select('submittedAt decidedAt statut')
        .lean(),
    ]);

    const compteurs: Record<string, number> = {};
    for (const entry of parStatut) compteurs[entry._id] = entry.total;

    const enAttente =
      (compteurs[VerificationStatus.EN_ATTENTE] || 0) +
      (compteurs[VerificationStatus.EN_REVUE] || 0) +
      (compteurs[VerificationStatus.INFOS_COMPLEMENTAIRES_REQUISES] || 0);

    const durees = decides.map(
      (r: any) => new Date(r.decidedAt).getTime() - new Date(r.submittedAt).getTime(),
    );
    const tempsMoyenHeures =
      durees.length > 0
        ? Math.round((durees.reduce((a, b) => a + b, 0) / durees.length / 3_600_000) * 10) / 10
        : 0;

    const rejetes = decides.filter((r: any) => r.statut === VerificationStatus.REJETE).length;
    const tauxRejet =
      decides.length > 0 ? Math.round((rejetes / decides.length) * 1000) / 10 : 0;

    return {
      enAttente,
      parStatut: compteurs,
      enRetard,
      suspects,
      tempsMoyenHeures,
      tauxRejet,
      slaHeures: 48,
    };
  }

  /** Compteur du badge de la barre latérale admin. */
  async countPending(): Promise<number> {
    return await VerificationRequest.countDocuments({
      statut: { $in: OPEN_VERIFICATION_STATUSES },
    });
  }

  /** Liste des administrateurs ayant la permission de révision. */
  async listReviewers() {
    const roles = await Role.find({
      isActive: true,
      permissions: 'verification:review',
    }).lean();

    const roleNames = roles.map(r => r.name);

    const reviewers = await User.find({
      role: { $in: roleNames },
    })
      .select('nom prenom email role')
      .lean();

    return reviewers.map((r: any) => ({
      id: String(r._id),
      nom: r.nom,
      prenom: r.prenom,
      email: r.email,
      fullName: `${r.prenom} ${r.nom}`.trim(),
    }));
  }

  /**
   * Détection des dossiers hors délai SLA et notification d'escalade.
   *
   * Appelée par un cron périodique : identifie les dossiers dont l'échéance
   * SLA est dépassée et qui n'ont pas encore été escaladés, notifie les
   * admins-réviseurs par notification in-app + email, et marque le dossier
   * comme escaladé pour éviter les doublons.
   */
  async detectSlaBreaches(): Promise<number> {
    const now = new Date();

    const overdue = await VerificationRequest.find({
      statut: { $in: OPEN_VERIFICATION_STATUSES },
      slaDueAt: { $lt: now },
      escalatedAt: null,
    })
      .populate({ path: 'userId', select: 'nom prenom email' })
      .lean();

    if (overdue.length === 0) return 0;

    // Récupérer les admins-réviseurs
    const roles = await Role.find({
      isActive: true,
      permissions: 'verification:review',
    }).lean();
    const roleNames = roles.map(r => r.name);
    const admins = await User.find({ role: { $in: roleNames } })
      .select('_id email')
      .lean();

    for (const request of overdue) {
      const user = request.userId as any;
      const titre = 'Dossier hors délai SLA';
      const corps = `${user?.prenom || ''} ${user?.nom || ''} — en retard depuis ${Math.round((now.getTime() - new Date(request.slaDueAt).getTime()) / 3_600_000)}h`;

      for (const admin of admins) {
        await Notification.create({
          userId: String(admin._id),
          titre,
          corps,
          type: NotificationType.VERIFICATION,
          metadata: { requestId: String(request._id), escalation: true },
        });
      }

      // Email d'escalade
      if (this.mailerService) {
        for (const admin of admins) {
          try {
            await this.mailerService.sendEmail({
              to: (admin as any).email,
              subject: `[URGENT] ${titre}`,
              html: `<p>${corps}</p><p>Le délai de ${SLA_HOURS}h est dépassé. Merci de traiter ce dossier en priorité.</p>`,
            });
          } catch {
            // Un échec email ne doit pas bloquer le processus.
          }
        }
      }

      // Marquer comme escaladé
      await VerificationRequest.updateOne(
        { _id: request._id },
        { $set: { escalatedAt: now } },
      );
    }

    return overdue.length;
  }

  // ── Interne ──────────────────────────────────────────────────────────────

  private async assertTransition(requestId: string, cible: VerificationStatus) {
    const request = await VerificationRequest.findById(requestId);
    if (!request) throw new NotFoundError('Dossier');

    const autorisees = ALLOWED_TRANSITIONS[request.statut] || [];
    if (!autorisees.includes(cible)) {
      throw new ForbiddenError(
        `Transition impossible : un dossier « ${request.statut} » ne peut pas passer à « ${cible} ».`,
      );
    }
    return request;
  }

  private async log(
    request: any,
    adminId: string,
    action: string,
    ancienStatut: string,
    ip?: string,
    motif?: string,
  ) {
    await VerificationAuditLog.create({
      requestId: String(request._id),
      userId: request.userId,
      adminId,
      action,
      ancienStatut,
      nouveauStatut: request.statut,
      motif,
      ip,
    });
  }

  /**
   * Email de décision. Un échec d'envoi ne doit jamais annuler une décision
   * déjà enregistrée : l'étudiant verra de toute façon le changement dans
   * l'application, l'email n'est qu'un canal secondaire.
   */
  private async notifyDecision(
    request: any,
    type: 'approuve' | 'rejete' | 'complement',
    motifLabel?: string,
    texte?: string,
  ) {
    try {
      const user = await User.findById(request.userId).select('email nom prenom').lean();
      if (!user) return;

      const prenom = (user as any).prenom || '';
      const restantes = Math.max(0, MAX_RESUBMISSIONS - request.tentatives);
      const resubmitLink = `${env.MOBILE_APP_URL}/verification`;

      const contenus = {
        approuve: {
          subject: 'Votre compte NextLearn est validé',
          html: `<p>Bonjour ${prenom},</p>
            <p>Votre dossier a été validé. Vous avez désormais accès à l'ensemble des contenus
            correspondant à votre parcours (${request.universiteNom || ''} — ${request.filiereNom || ''} — ${request.niveau}).</p>
            <p>Ouvrez simplement l'application : l'accès est déjà débloqué.</p>`,
        },
        rejete: {
          subject: "Votre dossier NextLearn n'a pas pu être validé",
          html: `<p>Bonjour ${prenom},</p>
            <p>Votre dossier n'a pas pu être validé pour le motif suivant :</p>
            <p><strong>${motifLabel || ''}</strong></p>
            ${texte ? `<p>${texte}</p>` : ''}
            <p>Vous pouvez soumettre un nouveau justificatif depuis l'application.
            ${restantes > 0
              ? `Il vous reste ${restantes} tentative${restantes > 1 ? 's' : ''}.`
              : 'Votre dossier sera examiné manuellement — contactez le support.'}</p>
            <p style="margin-top:16px">
              <a href="${resubmitLink}"
                 style="display:inline-block;padding:12px 24px;background:#1e3a5f;color:#fff;
                        text-decoration:none;border-radius:8px;font-weight:600">
                Soumettre un nouveau justificatif
              </a>
            </p>`,
        },
        complement: {
          subject: 'Complément demandé pour votre dossier NextLearn',
          html: `<p>Bonjour ${prenom},</p>
            <p>Votre dossier nécessite un complément avant validation :</p>
            <p><strong>${texte || ''}</strong></p>
            <p>Rendez-vous dans l'application pour renvoyer un justificatif.
            Vos informations sont déjà pré-remplies, seul le document est à joindre à nouveau.</p>
            <p style="margin-top:16px">
              <a href="${resubmitLink}"
                 style="display:inline-block;padding:12px 24px;background:#1e3a5f;color:#fff;
                        text-decoration:none;border-radius:8px;font-weight:600">
                Compléter mon dossier
              </a>
            </p>`,
        },
      };

      const contenu = contenus[type];
      await this.mailerService.sendEmail({
        to: (user as any).email,
        subject: contenu.subject,
        html: contenu.html,
      });
    } catch (error) {
      console.error('[VERIFICATION] Échec envoi email de décision :', error);
    }
  }
}
