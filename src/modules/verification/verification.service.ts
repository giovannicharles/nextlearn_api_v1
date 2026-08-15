import crypto from 'crypto';
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
import { ConflictError, NotFoundError, ForbiddenError } from '../../shared/errors/index';
import { resolveAcademicRefs } from '../../shared/utils/academic-refs';
import {
  SLA_HOURS,
  MAX_RESUBMISSIONS,
  JUSTIFICATIF_RETENTION_DAYS,
} from '../../shared/constants/verification';

export interface SubmitVerificationInput {
  nom: string;
  prenom: string;
  matricule?: string;
  universite: string;
  filiere: string;
  niveau: string;
  justificatifType: string;
}

export class VerificationService {
  constructor(
    private storageService: StorageService,
    private mailerService?: MailerService,
  ) {}

  /**
   * Soumission (ou resoumission) d'un dossier.
   *
   * Appelée une fois l'email personnel vérifié par code : le dossier n'entre
   * dans la file qu'avec une identité d'email confirmée.
   */
  async submit(
    userId: string,
    data: SubmitVerificationInput,
    file: Buffer,
    ip?: string,
  ) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('Utilisateur');

    // Un seul dossier ouvert à la fois — sinon un même étudiant pourrait
    // saturer la file en resoumettant en boucle.
    const existingOpen = await VerificationRequest.findOne({
      userId,
      statut: { $in: OPEN_VERIFICATION_STATUSES },
    });
    if (existingOpen && existingOpen.statut !== VerificationStatus.INFOS_COMPLEMENTAIRES_REQUISES) {
      throw new ConflictError('Un dossier est déjà en cours de traitement.');
    }

    const previousCount = await VerificationRequest.countDocuments({ userId });
    if (previousCount >= MAX_RESUBMISSIONS) {
      throw new ForbiddenError(
        `Nombre maximal de soumissions atteint (${MAX_RESUBMISSIONS}). Votre dossier sera examiné manuellement — contactez le support.`,
      );
    }

    // Empreinte du fichier : sert à repérer le même justificatif réutilisé sur
    // plusieurs comptes.
    const hash = crypto.createHash('sha256').update(file).digest('hex');
    const { suspect, raisons } = await this.detectDuplicates(userId, hash, data);

    const upload = await this.storageService.uploadFile(file, 'nextlearn/justificatifs', {
      // Stockage privé : le fichier n'est jamais joignable par URL publique,
      // seulement via une URL signée délivrée aux admins-réviseurs.
      type: 'authenticated',
      resource_type: 'auto',
    });

    const refs = await resolveAcademicRefs(data.universite, data.filiere);
    const now = new Date();

    // Une resoumission ferme le dossier précédent plutôt que d'en cumuler deux.
    if (existingOpen) {
      existingOpen.statut = VerificationStatus.REJETE;
      existingOpen.decidedAt = now;
      await existingOpen.save();
    }

    const request = await VerificationRequest.create({
      userId,
      statut: VerificationStatus.EN_ATTENTE,
      suspect,
      suspectRaisons: raisons,
      ...refs,
      universiteNom: data.universite,
      filiereNom: data.filiere,
      niveau: data.niveau,
      nom: data.nom,
      prenom: data.prenom,
      matricule: data.matricule,
      justificatifType: data.justificatifType,
      justificatifPublicId: upload.publicId,
      justificatifHash: hash,
      justificatifBytes: upload.bytes,
      justificatifUploadedAt: now,
      tentatives: previousCount + 1,
      submittedAt: now,
      slaDueAt: new Date(now.getTime() + SLA_HOURS * 60 * 60 * 1000),
    });

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          verificationStatus: VerificationStatus.EN_ATTENTE,
          verificationRequestId: String(request._id),
          nom: data.nom,
          prenom: data.prenom,
          universite: data.universite,
          filiere: data.filiere,
          niveau: data.niveau,
          ...refs,
        },
      },
    );

    await this.log({
      requestId: String(request._id),
      userId,
      action: previousCount > 0 ? 'RESUBMITTED' : 'SUBMITTED',
      nouveauStatut: VerificationStatus.EN_ATTENTE,
      ip,
    });

    await this.notifyAdmins(request, previousCount > 0);

    return this.toPublic(request);
  }

  /** État du dossier courant — interrogé en boucle par l'écran d'attente. */
  async getMyStatus(userId: string) {
    const request = await VerificationRequest.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    if (!request) {
      // Compte inscrit sans adresse institutionnelle mais n'ayant encore
      // jamais soumis de dossier : `verificationStatus` vaut alors 'requis'
      // sur le User (posé à l'inscription). Sans ce contrôle, l'application
      // ne redirige jamais l'étudiant vers le formulaire de dépôt.
      const user = await User.findById(userId).select('verificationStatus').lean();
      const requis = Boolean((user as any)?.verificationStatus);
      return { statut: null, requis, resoumissionsRestantes: requis ? MAX_RESUBMISSIONS : undefined };
    }

    return {
      ...this.toPublic(request),
      requis: true,
      resoumissionsRestantes: Math.max(0, MAX_RESUBMISSIONS - (request as any).tentatives),
    };
  }

  /**
   * Marque un dossier suspect si le justificatif ou l'identité correspond à un
   * dossier déjà déposé sur un autre compte. Jamais de rejet automatique :
   * c'est un signalement pour l'humain qui tranchera.
   */
  private async detectDuplicates(
    userId: string,
    hash: string,
    data: SubmitVerificationInput,
  ): Promise<{ suspect: boolean; raisons: string[] }> {
    const raisons: string[] = [];

    const sameFile = await VerificationRequest.findOne({
      justificatifHash: hash,
      userId: { $ne: userId },
    }).lean();
    if (sameFile) {
      raisons.push('Justificatif identique déjà déposé sur un autre compte');
    }

    if (data.matricule?.trim()) {
      const sameIdentity = await VerificationRequest.findOne({
        matricule: data.matricule.trim(),
        userId: { $ne: userId },
      }).lean();
      if (sameIdentity) {
        raisons.push('Matricule déjà utilisé sur un autre compte');
      }
    }

    const sameName = await VerificationRequest.findOne({
      nom: data.nom.trim(),
      prenom: data.prenom.trim(),
      statut: VerificationStatus.APPROUVE,
      userId: { $ne: userId },
    }).lean();
    if (sameName) {
      raisons.push('Nom et prénom déjà validés sur un autre compte');
    }

    return { suspect: raisons.length > 0, raisons };
  }

  async log(entry: {
    requestId: string;
    userId: string;
    adminId?: string;
    action: string;
    ancienStatut?: string;
    nouveauStatut?: string;
    motif?: string;
    ip?: string;
  }) {
    await VerificationAuditLog.create(entry);
  }

  /**
   * Purge les justificatifs des dossiers tranchés il y a plus de
   * JUSTIFICATIF_RETENTION_DAYS jours. Le dossier et le journal sont conservés,
   * seul le fichier disparaît.
   */
  async purgeExpiredJustificatifs(): Promise<number> {
    const cutoff = new Date(Date.now() - JUSTIFICATIF_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const expired = await VerificationRequest.find({
      decidedAt: { $lt: cutoff },
      justificatifPublicId: { $ne: null },
      justificatifPurgedAt: null,
    });

    let purged = 0;
    for (const request of expired) {
      try {
        if (request.justificatifPublicId) {
          await this.storageService.deleteFile(request.justificatifPublicId);
        }
        request.justificatifPublicId = undefined;
        request.justificatifPurgedAt = new Date();
        await request.save();
        purged++;
      } catch (error) {
        console.error(`[PURGE] Échec sur le dossier ${request._id}:`, error);
      }
    }

    return purged;
  }

  /**
   * Notifie les administrateurs-réviseurs qu'un nouveau dossier est entré
   * dans la file. Crée une notification in-app pour chaque réviseur et
   * envoie un email de digest. Les échecs n'empêchent jamais la soumission.
   */
  private async notifyAdmins(request: any, isResubmission: boolean) {
    try {
      const roles = await Role.find({
        isActive: true,
        permissions: 'verification:review',
      }).lean();
      const roleNames = roles.map(r => r.name);

      const admins = await User.find({ role: { $in: roleNames } })
        .select('_id email nom prenom')
        .lean();

      const titre = isResubmission
        ? 'Nouvelle resoumission de dossier'
        : 'Nouveau dossier de vérification';
      const corps = `${request.prenom} ${request.nom} — ${request.universiteNom} · ${request.filiereNom} · ${request.niveau}`;

      for (const admin of admins) {
        await Notification.create({
          userId: String(admin._id),
          titre,
          corps,
          type: NotificationType.VERIFICATION,
          metadata: { requestId: String(request._id) },
        });
      }

      if (this.mailerService && admins.length > 0) {
        const emails = admins.map((a: any) => a.email).filter(Boolean);
        for (const email of emails) {
          try {
            await this.mailerService.sendEmail({
              to: email,
              subject: titre,
              html: `<p>${corps}</p><p>Connectez-vous au back-office pour traiter ce dossier.</p>`,
            });
          } catch (e) {
            // Un échec sur un destinataire ne doit pas bloquer les autres.
          }
        }
      }
    } catch (error) {
      console.error('[VERIFICATION] Échec de la notification admin :', error);
    }
  }

  /** Projection sans donnée sensible — jamais le publicId du justificatif. */
  private toPublic(request: any) {
    return {
      id: String(request._id),
      statut: request.statut,
      niveau: request.niveau,
      universite: request.universiteNom,
      filiere: request.filiereNom,
      justificatifType: request.justificatifType,
      motifRejetCode: request.motifRejetCode,
      motifRejetTexte: request.motifRejetTexte,
      messageComplement: request.messageComplement,
      tentatives: request.tentatives,
      submittedAt: request.submittedAt,
      decidedAt: request.decidedAt,
    };
  }
}
