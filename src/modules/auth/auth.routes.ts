import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authGuard } from '../../middleware/auth.guard';

export const createAuthRoutes = (authController: AuthController): Router => {
  const router = Router();

  // Debug logging for all auth routes
  router.use((req, res, next) => {
    console.log(`[Auth Route] ${req.method} ${req.path}`);
    console.log(`[Auth Route] Body:`, JSON.stringify(req.body));
    next();
  });

  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     summary: Inscription (étape 1-2) - Création du compte et envoi OTP
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, nom, prenom, universite, filiere, niveau]
   *             properties:
   *               email: { type: string, example: marvin.tientcheu@isj.cm }
   *               nom: { type: string, example: Tientcheu }
   *               prenom: { type: string, example: Marvin }
   *               universite: { type: string, example: ISJ Yaoundé }
   *               filiere: { type: string, example: Informatique }
   *               niveau: { type: string, enum: [L1, L2, L3, M1, M2] }
   *     responses:
   *       201:
   *         description: Compte créé, OTP envoyé
   */
  router.post('/register', (req, res) => authController.register(req, res));
  /**
   * @swagger
   * /api/auth/verify-otp:
   *   post:
   *     summary: Vérification du code OTP (étape 3)
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [tempToken, code]
   *             properties:
   *               tempToken: { type: string }
   *               code: { type: string, example: "123456" }
   *     responses:
   *       200:
   *         description: E-mail vérifié
   */
  router.post('/verify-otp', (req, res) => authController.verifyOtp(req, res));
  /**
   * @swagger
   * /api/auth/setup-pin:
   *   post:
   *     summary: Configuration du PIN (étape 4) - Retourne les tokens JWT
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [tempToken, pin]
   *             properties:
   *               tempToken: { type: string }
   *               pin: { type: string, example: "1234" }
   *     responses:
   *       200:
   *         description: Compte activé, tokens JWT retournés
   */
  router.post('/setup-pin', (req, res) => authController.setupPin(req, res));
  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Connexion avec email + PIN
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, pin]
   *             properties:
   *               email: { type: string }
   *               pin: { type: string, example: "1234" }
   *     responses:
   *       200:
   *         description: PIN vérifié, code OTP 2FA envoyé par e-mail
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 tempToken: { type: string }
   *                 expiresIn: { type: integer }
   *                 maskedEmail: { type: string }
   */
  router.post('/login', (req, res) => authController.login(req, res));
  /**
   * @swagger
   * /api/auth/verify-2fa:
   *   post:
   *     summary: Vérification du code 2FA après login (étape 2 de la connexion)
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [tempToken, code]
   *             properties:
   *               tempToken: { type: string }
   *               code: { type: string, example: "123456" }
   *     responses:
   *       200:
   *         description: Connexion réussie, tokens JWT retournés
   */
  router.post('/verify-2fa', (req, res) => authController.verify2faLogin(req, res));
  /**
   * @swagger
   * /api/auth/refresh:
   *   post:
   *     summary: Rafraîchir l'access token
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *             properties:
   *               refreshToken: { type: string }
   *     responses:
   *       200:
   *         description: Nouveau access token
   */
  router.post('/refresh', (req, res) => authController.refreshToken(req, res));
  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: Déconnexion (révoque les refresh tokens)
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Déconnexion réussie
   */
  router.post('/logout', authGuard, (req, res) => authController.logout(req, res));
  /**
   * @swagger
   * /api/auth/resend-otp:
   *   post:
   *     summary: Renvoyer un code OTP
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [tempToken]
   *             properties:
   *               tempToken: { type: string }
   *     responses:
   *       200:
   *         description: Nouveau code OTP envoyé
   */
  router.post('/resend-otp', (req, res) => authController.resendOtp(req, res));
  /**
   * @swagger
   * /api/auth/reset-pin:
   *   post:
   *     summary: Réinitialiser le PIN via OTP envoyé par email
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email]
   *             properties:
   *               email: { type: string }
   *     responses:
   *       200:
   *         description: OTP de réinitialisation envoyé
   */
  router.post('/reset-pin', (req, res) => authController.resetPin(req, res));
  /**
   * @swagger
   * /api/auth/confirm-reset-pin:
   *   post:
   *     summary: Confirmer la réinitialisation du PIN avec le code OTP et le nouveau PIN
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [tempToken, code, newPin]
   *             properties:
   *               tempToken: { type: string }
   *               code: { type: string, example: "123456" }
   *               newPin: { type: string, example: "1234" }
   *     responses:
   *       200:
   *         description: PIN réinitialisé avec succès
   */
  router.post('/confirm-reset-pin', (req, res) => authController.confirmResetPin(req, res));
  /**
   * @swagger
   * /api/auth/me:
   *   get:
   *     summary: Profil utilisateur courant
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profil utilisateur
   */
  router.get('/me', authGuard, (req, res) => authController.getMe(req, res));

  return router;
};
