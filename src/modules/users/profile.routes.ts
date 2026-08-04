import { Router } from 'express';
import { UserController } from './user.controller';
import { authGuard } from '../../middleware/auth.guard';

export const createProfileRoutes = (userController: UserController): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/profile:
   *   get:
   *     summary: Profil complet avec statistiques
   *     tags: [Profile]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profil utilisateur avec stats
   */
  router.get('/', authGuard, (req, res) => userController.getProfile(req, res));

  /**
   * @swagger
   * /api/profile:
   *   put:
   *     summary: Mettre à jour le profil
   *     tags: [Profile]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               nom: { type: string }
   *               prenom: { type: string }
   *               universite: { type: string }
   *               filiere: { type: string }
   *               niveau: { type: string, enum: [L1, L2, L3, M1, M2] }
   *               langue: { type: string, enum: [FR, EN] }
   *     responses:
   *       200:
   *         description: Profil mis à jour
   */
  router.put('/', authGuard, (req, res) => userController.updateProfile(req, res));

  /**
   * @swagger
   * /api/profile/language:
   *   put:
   *     summary: Changer la langue de l'utilisateur
   *     tags: [Profile]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [langue]
   *             properties:
   *               langue: { type: string, enum: [FR, EN] }
   *     responses:
   *       200:
   *         description: Langue mise à jour
   */
  router.put('/language', authGuard, (req, res) => userController.updateLanguage(req, res));

  /**
   * @swagger
   * /api/profile/avatar:
   *   put:
   *     summary: Mettre à jour l'avatar
   *     tags: [Profile]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [avatarUrl]
   *             properties:
   *               avatarUrl: { type: string }
   *     responses:
   *       200:
   *         description: Avatar mis à jour
   */
  router.put('/avatar', authGuard, (req, res) => userController.updateAvatar(req, res));

  return router;
};
