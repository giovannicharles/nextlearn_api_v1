import { Router } from 'express';
import { ProgressionController } from './progression.controller';
import { authGuard } from '../../middleware/auth.guard';

export const createProgressionRoutes = (progressionController: ProgressionController): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/progression/stats:
   *   get:
   *     summary: Statistiques globales de progression
   *     tags: [Progression]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: totalMinutes, sessionCount, streak, docsLus, matiereTop
   */
  router.get('/stats', authGuard, (req, res) => progressionController.getStats(req, res));
  /**
   * @swagger
   * /api/progression/streak:
   *   get:
   *     summary: Streak actuel (jours consécutifs d'étude)
   *     tags: [Progression]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Nombre de jours consécutifs
   */
  router.get('/streak', authGuard, (req, res) => progressionController.getStreak(req, res));
  /**
   * @swagger
   * /api/progression/week-activity:
   *   get:
   *     summary: Activité des 7 derniers jours (minutes/jour)
   *     tags: [Progression]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste { day, minutes }
   */
  router.get('/week-activity', authGuard, (req, res) => progressionController.getWeekActivity(req, res));
  /**
   * @swagger
   * /api/progression/matiere-activity:
   *   get:
   *     summary: Répartition du temps d'étude par matière (top 5)
   *     tags: [Progression]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste { matiere, minutes }
   */
  router.get('/matiere-activity', authGuard, (req, res) => progressionController.getMatiereActivity(req, res));
  /**
   * @swagger
   * /api/progression/study-session:
   *   post:
   *     summary: Enregistrer une session d'étude
   *     tags: [Progression]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [documentId, dureeSecondes, pagesLues]
   *             properties:
   *               documentId: { type: string }
   *               dureeSecondes: { type: integer }
   *               pagesLues: { type: integer }
   *               date: { type: string, format: date-time }
   *     responses:
   *       201:
   *         description: Session enregistrée
   */
  router.post('/study-session', authGuard, (req, res) => progressionController.createStudySession(req, res));
  /**
   * @swagger
   * /api/progression/badges:
   *   get:
   *     summary: Liste des badges obtenus par l'utilisateur
   *     tags: [Progression]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des badges
   */
  router.get('/badges', authGuard, (req, res) => progressionController.getBadges(req, res));
  /**
   * @swagger
   * /api/progression/badges/check:
   *   post:
   *     summary: Vérifier et attribuer les nouveaux badges mérités
   *     tags: [Progression]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des badges (mise à jour)
   */
  router.post('/badges/check', authGuard, (req, res) => progressionController.checkBadges(req, res));

  return router;
};
