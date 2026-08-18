// src/modules/admin/admin.routes.js
const express        = require('express');
const router         = express.Router();
const adminCtrl      = require('./admin.controller');
const authMiddleware = require('../../middleware/auth.middleware');

// Middleware : vérifier token + extraire adminUser pour le logging
const requireAdmin = [
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    (req, res, next) => {
        // Enrichir req.adminUser pour les logs d'activité
        req.adminUser = {
            id:    req.user.id,
            email: req.user.email || '',
            name:  req.user.name  || req.user.email || 'Admin',
            role:  req.user.role,
        };
        next();
    }
];

// ── Dashboard ─────────────────────────────────────────────────
router.get('/dashboard/stats', requireAdmin, adminCtrl.getDashboardStats);

// ── Users ─────────────────────────────────────────────────────
router.get   ('/users',                     requireAdmin, adminCtrl.getUsers);
router.get   ('/users/:id',                 requireAdmin, adminCtrl.getUserById);
router.post  ('/users',                     requireAdmin, adminCtrl.createUser);
router.put   ('/users/:id',                 requireAdmin, adminCtrl.updateUser);
router.delete('/users/:id',                 requireAdmin, adminCtrl.deleteUser);
router.patch ('/users/:id/block',           requireAdmin, adminCtrl.blockUser);
router.patch ('/users/:id/unblock',         requireAdmin, adminCtrl.unblockUser);
router.patch ('/users/:id/reset-password',  requireAdmin, adminCtrl.resetUserPassword);
router.patch ('/users/:id/role',            requireAdmin, adminCtrl.changeUserRole);

// ── Reports ────────────────────────────────────────────────────
router.get('/reports',           requireAdmin, adminCtrl.getReports);

// ── Activities ─────────────────────────────────────────────────
router.get('/activities',        requireAdmin, adminCtrl.getActivities);
router.get('/activities/stats',  requireAdmin, adminCtrl.getActivityStats);

module.exports = router;
