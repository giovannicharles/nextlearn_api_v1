import { Router } from 'express';
import { ProgressController } from './progress.controller';
import { authGuard } from '../../middleware/auth.guard';

export const createProgressRoutes = (progressController: ProgressController): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/progress/lecture/{documentId}:
   *   get:
   *     summary: Progression de lecture d'un document
   *     tags: [Progress]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: documentId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: pageCourante, totalPages, tempsTotalSecondes
   */
  router.get('/lecture/:documentId', authGuard, (req, res) => progressController.getLectureProgress(req, res));
  /**
   * @swagger
   * /api/progress/lecture/{documentId}:
   *   put:
   *     summary: Mettre à jour la progression de lecture
   *     tags: [Progress]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: documentId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               pageCourante: { type: integer }
   *               totalPages: { type: integer }
   *               tempsTotalSecondes: { type: integer }
   *     responses:
   *       200:
   *         description: Progression mise à jour
   */
  router.put('/lecture/:documentId', authGuard, (req, res) => progressController.updateLectureProgress(req, res));
  /**
   * @swagger
   * /api/progress/lecture:
   *   get:
   *     summary: Liste de toutes les progressions de lecture de l'utilisateur
   *     tags: [Progress]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des progressions
   */
  router.get('/lecture', authGuard, (req, res) => progressController.listUserProgress(req, res));
  /**
   * @swagger
   * /api/progress/sessions:
   *   post:
   *     summary: Créer une session d'étude
   *     tags: [Progress]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Session créée
   */
  router.post('/sessions', authGuard, (req, res) => progressController.createStudySession(req, res));
  /**
   * @swagger
   * /api/progress/sessions:
   *   get:
   *     summary: Liste des sessions d'étude de l'utilisateur
   *     tags: [Progress]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des sessions
   */
  router.get('/sessions', authGuard, (req, res) => progressController.listStudySessions(req, res));
  /**
   * @swagger
   * /api/progress/stats:
   *   get:
   *     summary: Statistiques d'étude (module progress)
   *     tags: [Progress]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Statistiques
   */
  router.get('/stats', authGuard, (req, res) => progressController.getStudyStats(req, res));

  return router;
};
