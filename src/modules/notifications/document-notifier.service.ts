import { Notification, NotificationType, User, UserStatus } from '../../models/index';

/**
 * Notification des étudiants concernés lors de la publication d'un contenu.
 *
 * Ciblage **ET strict** sur niveau + filière + université, avec la sémantique
 * retenue pour les champs optionnels : un contenu sans université est
 * générique et concerne toutes les facs, idem pour la filière. Un champ
 * renseigné devient en revanche une contrainte ferme.
 *
 * Déclenché par l'événement de publication lui-même — pas de tâche planifiée
 * ni d'action manuelle de l'administrateur.
 */
export interface NotifiableContent {
  id: string;
  titre: string;
  matiereNom?: string;
  niveau: string;
  filiereId?: string | null;
  universiteId?: string | null;
}

export class DocumentNotifierService {
  /**
   * Construit la requête d'audience.
   *
   * Exposée à part pour pouvoir compter l'audience sans envoyer (utile à
   * l'admin avant publication, et testable isolément).
   */
  static buildAudienceQuery(content: NotifiableContent): Record<string, unknown> {
    const query: Record<string, unknown> = {
      niveau: content.niveau,
      // Un compte suspendu ou banni n'est pas notifié.
      status: UserStatus.ACTIVE,
      role: 'user',
      // Un compte en attente de vérification n'a pas accès au contenu : le
      // notifier d'une nouveauté qu'il ne peut pas ouvrir serait absurde.
      $or: [
        { verificationStatus: { $exists: false } },
        { verificationStatus: null },
        { verificationStatus: 'approuve' },
      ],
    };

    if (content.filiereId) query.filiereId = String(content.filiereId);
    if (content.universiteId) query.universiteId = String(content.universiteId);

    return query;
  }

  static async countAudience(content: NotifiableContent): Promise<number> {
    return await User.countDocuments(this.buildAudienceQuery(content));
  }

  /**
   * Crée une notification par utilisateur ciblé.
   *
   * `metadata.documentId` est ce qui permet au mobile d'ouvrir directement le
   * document au tap sur la notification (voir la correction du BUG-01).
   */
  static async notifyNewDocument(
    content: NotifiableContent,
    type: 'document' | 'epreuve' = 'document',
  ): Promise<{ cibles: number }> {
    const users = await User.find(this.buildAudienceQuery(content))
      .select('_id')
      .lean();

    if (users.length === 0) return { cibles: 0 };

    const matiere = content.matiereNom ? ` en ${content.matiereNom}` : '';
    const titre = type === 'epreuve' ? 'Nouvelle épreuve disponible' : 'Nouveau document disponible';
    const corps =
      type === 'epreuve'
        ? `Une épreuve${matiere} vient d'être publiée pour ton niveau.`
        : `« ${content.titre} »${matiere} vient d'être ajouté à ta bibliothèque.`;

    const notifications = users.map(u => ({
      userId: String((u as any)._id),
      type: type === 'epreuve' ? NotificationType.EPREUVE : NotificationType.NOUVEAU_COURS,
      titre,
      corps,
      metadata: type === 'epreuve' ? { epreuveId: content.id } : { documentId: content.id },
      lu: false,
      createdAt: new Date(),
    }));

    await Notification.insertMany(notifications);
    return { cibles: notifications.length };
  }
}
