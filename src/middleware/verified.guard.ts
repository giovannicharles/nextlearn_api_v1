import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.guard';
import { User, VerificationStatus } from '../models/index';
import { ForbiddenError } from '../shared/errors/index';

/**
 * Refuse l'accès au contenu tant qu'un dossier de vérification n'est pas
 * approuvé.
 *
 * Ne concerne que les comptes portant un `verificationStatus` — c'est-à-dire
 * ceux inscrits sans adresse institutionnelle. **Un compte standard n'a pas ce
 * champ et passe donc sans aucun changement de comportement.**
 *
 * À placer après `authGuard`. Sur les routes de contenu non authentifiées, il
 * ne peut évidemment rien filtrer : le verrou effectif porte sur l'accès aux
 * fichiers (URL signée, téléchargement) et sur le parcours de l'application.
 */
export const verifiedGuard = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    next();
    return;
  }

  const user = await User.findById(req.user.id).select('verificationStatus role').lean();
  const status = (user as any)?.verificationStatus;

  // Compte standard, ou dossier approuvé : rien à filtrer.
  if (!status || status === VerificationStatus.APPROUVE) {
    next();
    return;
  }

  // Un administrateur n'est jamais bloqué par ce garde.
  if ((user as any)?.role && String((user as any).role).toLowerCase() !== 'user') {
    next();
    return;
  }

  if (status === VerificationStatus.REJETE) {
    throw new ForbiddenError('Votre dossier a été refusé. Consultez le motif et soumettez un nouveau justificatif.');
  }
  if (status === 'requis' || status === VerificationStatus.INFOS_COMPLEMENTAIRES_REQUISES) {
    throw new ForbiddenError('Un justificatif de scolarité est requis pour accéder au contenu. Déposez votre dossier.');
  }
  throw new ForbiddenError(
    'Votre compte est en attente de vérification. L’accès sera débloqué dès validation de votre dossier.',
  );
};
