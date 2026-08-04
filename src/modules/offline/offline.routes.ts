import { Router } from 'express';
import { OfflineController } from './offline.controller';
import { authGuard } from '../../middleware/auth.guard';

export const createOfflineRoutes = (offlineController: OfflineController): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/offline/{documentId}:
   *   post:
   *     summary: Marquer un document comme téléchargé offline
   *     tags: [Offline]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: documentId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       201:
   *         description: Téléchargement offline enregistré
   */
  router.post('/:documentId', authGuard, (req, res) => offlineController.addDownload(req, res));
  /**
   * @swagger
   * /api/offline/{documentId}:
   *   delete:
   *     summary: Retirer un document du offline
   *     tags: [Offline]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: documentId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Retiré du offline
   */
  router.delete('/:documentId', authGuard, (req, res) => offlineController.removeDownload(req, res));
  /**
   * @swagger
   * /api/offline/documents:
   *   get:
   *     summary: Liste des documents téléchargés offline
   *     tags: [Offline]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des téléchargements
   */
  router.get('/documents', authGuard, (req, res) => offlineController.listDownloads(req, res));
  /**
   * @swagger
   * /api/offline/check/{documentId}:
   *   get:
   *     summary: Vérifier si un document est téléchargé offline
   *     tags: [Offline]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: documentId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: isDownloaded (booléen)
   */
  router.get('/check/:documentId', authGuard, (req, res) => offlineController.checkDownloaded(req, res));

  return router;
};
