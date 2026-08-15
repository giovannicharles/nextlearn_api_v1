import { Router } from 'express';
import multer from 'multer';
import { EpreuveController } from './epreuve.controller';
import { authGuard, adminGuard } from '../../middleware/auth.guard';
import { verifiedGuard } from '../../middleware/verified.guard';
import { cache } from '../../middleware/cache.middleware';
import { academicFilter } from '../../middleware/academic-filter.middleware';
import env from '../../config/env';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont autorisés'));
    }
  },
});

export const createEpreuveRoutes = (epreuveController: EpreuveController): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/epreuves:
   *   get:
   *     summary: Liste paginée des épreuves (annales) avec filtres
   *     tags: [Epreuves]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer }
   *       - in: query
   *         name: limit
   *         schema: { type: integer }
   *       - in: query
   *         name: matiere
   *         schema: { type: string }
   *       - in: query
   *         name: annee
   *         schema: { type: integer }
   *       - in: query
   *         name: avecCorrige
   *         schema: { type: boolean }
   *     responses:
   *       200:
   *         description: Liste des épreuves
   */
  router.get('/', academicFilter, (req, res) => epreuveController.listEpreuves(req, res));
  /**
   * @swagger
   * /api/epreuves/{id}:
   *   get:
   *     summary: Détail d'une épreuve
   *     tags: [Epreuves]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Détail de l'épreuve
   */
  router.get('/:id', (req, res) => epreuveController.getEpreuveById(req, res));
  /**
   * @swagger
   * /api/epreuves/{id}/view:
   *   post:
   *     summary: Incrémenter le compteur de vues d'une épreuve
   *     tags: [Epreuves]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Vues incrémentées
   */
  router.post('/:id/view', authGuard, (req, res) => epreuveController.incrementViews(req, res));
  /**
   * @swagger
   * /api/epreuves/{id}/download:
   *   post:
   *     summary: Télécharger une épreuve (incrémente le compteur + génère URL signée)
   *     tags: [Epreuves]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *       - in: query
   *         name: type
   *         schema: { type: string, enum: [epreuve, corrige] }
   *     responses:
   *       200:
   *         description: URL signée pour téléchargement
   */
  router.post('/:id/download', authGuard, verifiedGuard, (req, res) => epreuveController.downloadEpreuve(req, res));
  /**
   * @swagger
   * /api/epreuves/{id}/signed-url:
   *   get:
   *     summary: URL signée pour télécharger l'épreuve/corrigé
   *     tags: [Epreuves]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: URL signée
   */
  router.get('/:id/signed-url', authGuard, verifiedGuard, (req, res) => epreuveController.getSignedUrl(req, res));
  /**
   * @swagger
   * /api/epreuves:
   *   post:
   *     summary: Créer une épreuve (admin)
   *     tags: [Epreuves]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Épreuve créée
   */
  router.post('/', authGuard, adminGuard, upload.fields([
    { name: 'epreuve', maxCount: 1 },
    { name: 'corrige', maxCount: 1 },
  ]), (req, res) => epreuveController.createEpreuve(req, res));
  /**
   * @swagger
   * /api/epreuves/{id}:
   *   put:
   *     summary: Modifier une épreuve (admin)
   *     tags: [Epreuves]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Épreuve mise à jour
   */
  router.put('/:id', authGuard, adminGuard, (req, res) => epreuveController.updateEpreuve(req, res));
  /**
   * @swagger
   * /api/epreuves/{id}:
   *   delete:
   *     summary: Supprimer une épreuve (admin)
   *     tags: [Epreuves]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Épreuve supprimée
   */
  router.delete('/:id', authGuard, adminGuard, (req, res) => epreuveController.deleteEpreuve(req, res));
  /**
   * @swagger
   * /api/epreuves/{id}/rate:
   *   post:
   *     summary: Noter une épreuve (1-5)
   *     tags: [Epreuves]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [note]
   *             properties:
   *               note: { type: integer, minimum: 1, maximum: 5 }
   *     responses:
   *       200:
   *         description: Note enregistrée
   */
  router.post('/:id/rate', authGuard, (req, res) => epreuveController.rateEpreuve(req, res));

  return router;
};
