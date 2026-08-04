import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authGuard } from '../../middleware/auth.guard';

export const createNotificationRoutes = (notificationController: NotificationController): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/notifications:
   *   get:
   *     summary: Liste des notifications (paginée)
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des notifications
   */
  router.get('/', authGuard, (req, res) => notificationController.listNotifications(req, res));
  /**
   * @swagger
   * /api/notifications/unread-count:
   *   get:
   *     summary: Compteur de notifications non lues
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: { count }
   */
  router.get('/unread-count', authGuard, (req, res) => notificationController.countUnread(req, res));
  /**
   * @swagger
   * /api/notifications/{id}/read:
   *   put:
   *     summary: Marquer une notification comme lue
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Notification marquée comme lue
   */
  router.put('/:id/read', authGuard, (req, res) => notificationController.markAsRead(req, res));
  /**
   * @swagger
   * /api/notifications/read-all:
   *   put:
   *     summary: Tout marquer comme lu
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Toutes les notifications marquées comme lues
   */
  router.put('/read-all', authGuard, (req, res) => notificationController.markAllAsRead(req, res));
  /**
   * @swagger
   * /api/notifications/{id}:
   *   delete:
   *     summary: Supprimer une notification
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Notification supprimée
   */
  router.delete('/:id', authGuard, (req, res) => notificationController.deleteNotification(req, res));

  return router;
};
