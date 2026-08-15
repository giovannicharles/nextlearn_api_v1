import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { VerificationController } from './verification.controller';
import { authGuard } from '../../middleware/auth.guard';
import env from '../../config/env';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    // Un justificatif est une photo ou un PDF — rien d'autre.
    const accepted = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'];
    if (accepted.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formats acceptés : PDF, JPG, PNG'));
    }
  },
});

/**
 * Limite les soumissions par IP : freine la création de faux comptes en masse,
 * sans gêner un étudiant légitime qui resoumet après un rejet.
 */
const submitRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Trop de soumissions depuis cet appareil. Réessayez dans une heure.',
    },
  },
});

export const createVerificationRoutes = (
  verificationController: VerificationController,
): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/verification/requests:
   *   post:
   *     summary: Soumettre un dossier de vérification académique
   *     tags: [Verification]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Dossier déposé, en attente de revue
   */
  router.post(
    '/requests',
    authGuard,
    submitRateLimiter,
    upload.single('justificatif'),
    (req, res) => verificationController.submit(req as any, res),
  );

  /**
   * @swagger
   * /api/verification/requests/me:
   *   get:
   *     summary: État de mon dossier (interrogé par l'écran d'attente)
   *     tags: [Verification]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Statut courant
   */
  router.get('/requests/me', authGuard, (req, res) =>
    verificationController.getMyStatus(req as any, res));

  return router;
};
