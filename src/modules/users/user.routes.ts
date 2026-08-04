import { Router } from 'express';
import { UserController } from './user.controller';
import { authGuard, adminGuard } from '../../middleware/auth.guard';

export const createUserRoutes = (userController: UserController): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/users/me:
   *   get:
   *     summary: Profil complet de l'utilisateur courant
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profil utilisateur
   */
  router.get('/me', authGuard, (req, res) => userController.getProfile(req, res));
  /**
   * @swagger
   * /api/users/me:
   *   patch:
   *     summary: Mettre à jour le profil (nom, langue, avatar, etc.)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profil mis à jour
   */
  router.patch('/me', authGuard, (req, res) => userController.updateProfile(req, res));
  /**
   * @swagger
   * /api/users/change-pin:
   *   post:
   *     summary: Changer le PIN de l'utilisateur
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [oldPin, newPin]
   *             properties:
   *               oldPin: { type: string }
   *               newPin: { type: string }
   *     responses:
   *       200:
   *         description: PIN modifié
   */
  router.post('/change-pin', authGuard, (req, res) => userController.changePin(req, res));
  /**
   * @swagger
   * /api/users/fcm-token:
   *   post:
   *     summary: Mettre à jour le token FCM (notifications push)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [fcmToken]
   *             properties:
   *               fcmToken: { type: string }
   *     responses:
   *       200:
   *         description: Token FCM mis à jour
   */
  router.post('/fcm-token', authGuard, (req, res) => userController.updateFcmToken(req, res));
  /**
   * @swagger
   * /api/users/me:
   *   delete:
   *     summary: Supprimer le compte utilisateur
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Compte supprimé
   */
  router.delete('/me', authGuard, (req, res) => userController.deleteAccount(req, res));
  /**
   * @swagger
   * /api/users:
   *   get:
   *     summary: Liste des utilisateurs (admin)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des utilisateurs
   */
  router.get('/', authGuard, adminGuard, (req, res) => userController.listUsers(req, res));

  return router;
};
