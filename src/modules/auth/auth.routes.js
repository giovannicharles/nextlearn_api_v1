// src/modules/auth/auth.routes.js
const express        = require('express');
const router         = express.Router();
const authController = require('./auth.controller');
const authMiddleware = require('../../middleware/auth.middleware');

// ── Routes publiques ──────────────────────────────────────────
router.post('/register',           authController.register);
router.post('/login',              authController.login);
router.post('/refresh-token',      authController.refreshToken);
router.post('/2fa/verify-login',   authController.verifyLoginTwoFactor);
router.post('/2fa/resend',         authController.resendOtp);
router.post('/forgot-password',    authController.forgotPassword);
router.post('/reset-password',     authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);

// ── Routes protégées (token complet requis) ───────────────────
router.get('/validate-token',   authMiddleware.verifyToken, authController.validateToken);
router.get('/profile',          authMiddleware.verifyToken, authController.getProfile);
router.put('/profile',          authMiddleware.verifyToken, authController.updateProfile);
router.post('/change-password', authMiddleware.verifyToken, authController.changePassword);

module.exports = router;