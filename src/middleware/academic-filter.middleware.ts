import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import { User } from '../models/index';

/**
 * Filtre académique optionnel : si l'utilisateur est authentifié et a un
 * triplet (universite / filiere / niveau) défini, ce triplet est injecté dans
 * `req.query` pour que les contrôleurs restreignent automatiquement la liste
 * des documents et épreuves à ce qui correspond à son parcours.
 *
 * - Un compte standard (email institutionnel) n'a pas de `verificationStatus` :
 *   son triplet est déjà de confiance (domaine vérifié à l'inscription), il est
 *   filtré normalement.
 * - Un compte vérifié (`verificationStatus === 'approuve'`) : son triplet a été
 *   validé humainement, il est filtré.
 * - Un compte en attente / rejeté / requis : le `verifiedGuard` bloque déjà
 *   l'accès aux fichiers. Pour la liste, on filtre quand même par triplet pour
 *   ne pas exposer des contenus hors-parcours.
 * - Un administrateur n'est jamais filtré.
 * - Une requête sans token (navigation publique) passe sans filtre.
 */
export const academicFilter = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  let decoded: { id: string; role?: string };
  try {
    decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; role?: string };
  } catch {
    return next();
  }

  const role = (decoded.role || 'user').toLowerCase();
  if (role !== 'user') {
    return next();
  }

  try {
    const user = await User.findById(decoded.id)
      .select('universiteId filiereId niveau verificationStatus')
      .lean();

    if (!user) return next();

    if (user.universiteId && !req.query.universiteId) {
      req.query.universiteId = String(user.universiteId);
    }
    if (user.filiereId && !req.query.filiereId) {
      req.query.filiereId = String(user.filiereId);
    }
    if (user.niveau && !req.query.niveau) {
      req.query.niveau = String(user.niveau);
    }
  } catch {
    // En cas d'erreur DB, on laisse passer sans filtre plutôt que de bloquer.
  }

  next();
};
