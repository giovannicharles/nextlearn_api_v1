import { Router } from 'express';
import { SupportController } from './support.controller';
import { authGuard, permissionGuard } from '../../middleware/auth.guard';

/** Routes étudiant : signaler un problème depuis l'application. */
export const createSupportRoutes = (supportController: SupportController): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/support/tickets:
   *   post:
   *     summary: Signaler un problème
   *     tags: [Support]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Ticket créé
   */
  router.post('/tickets', authGuard, (req, res) => supportController.createTicket(req as any, res));

  /**
   * @swagger
   * /api/support/tickets:
   *   get:
   *     summary: Mes signalements
   *     tags: [Support]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des tickets de l'utilisateur
   */
  router.get('/tickets', authGuard, (req, res) => supportController.listMyTickets(req as any, res));

  return router;
};

/** Routes administration : file de traitement et actions correctives. */
export const createAdminSupportRoutes = (supportController: SupportController): Router => {
  const router = Router();

  router.get('/tickets', permissionGuard('user:read'), (req, res) =>
    supportController.listTickets(req as any, res));
  router.put('/tickets/:id', permissionGuard('user:update'), (req, res) =>
    supportController.updateTicket(req as any, res));
  router.get('/accounts-needing-attention', permissionGuard('user:read'), (req, res) =>
    supportController.listAccountsNeedingAttention(req as any, res));
  router.post('/accounts/:id/unlock', permissionGuard('user:suspend'), (req, res) =>
    supportController.unlockAccount(req as any, res));

  return router;
};
