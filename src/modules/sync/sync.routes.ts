import { Router } from 'express';
import { SyncController } from './sync.controller';
import { authGuard } from '../../middleware/auth.guard';

export const createSyncRoutes = (syncController: SyncController): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/sync:
   *   post:
   *     summary: Synchroniser les données offline (sessions, progress, favoris)
   *     tags: [Sync]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               lastSyncAt: { type: string, format: date-time }
   *               pendingSessions: { type: array, items: { type: object } }
   *               pendingProgress: { type: array, items: { type: object } }
   *     responses:
   *       200:
   *         description: Synchronisation effectuée
   */
  router.post('/', authGuard, (req, res) => syncController.syncData(req, res));
  /**
   * @swagger
   * /api/sync:
   *   get:
   *     summary: Récupérer les données depuis la dernière synchronisation
   *     tags: [Sync]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: newDocuments, updatedDocuments, newEpreuves, newNotifications, serverTime
   */
  router.get('/', authGuard, (req, res) => syncController.getSyncData(req, res));

  return router;
};
