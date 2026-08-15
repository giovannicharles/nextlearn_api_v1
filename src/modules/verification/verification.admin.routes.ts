import { Router, Response } from 'express';
import { VerificationAdminController } from './verification.admin.controller';
import { permissionGuard } from '../../middleware/auth.guard';
import { VerificationAdminService } from './verification.admin.service';

/**
 * Back-office des dossiers de vérification.
 *
 * RBAC : `verification:review` est requise pour tout, y compris la simple
 * lecture — les justificatifs contiennent des pièces d'identité scolaire et ne
 * doivent être visibles que des administrateurs-réviseurs.
 */
export const createVerificationAdminRoutes = (
  controller: VerificationAdminController,
  service: VerificationAdminService,
): Router => {
  const router = Router();
  const review = permissionGuard('verification:review');

  router.get('/requests', review, (req, res) => controller.list(req as any, res));
  router.get('/stats', review, (req, res) => controller.stats(req as any, res));
  router.get('/reviewers', review, (req, res) => controller.reviewers(req as any, res));
  router.get('/requests/:id', review, (req, res) => controller.detail(req as any, res));

  // SSE : push des stats et compteur de file toutes les 15 secondes.
  router.get('/events', review, (req: any, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 15000\n\n');

    const push = async () => {
      try {
        const stats = await service.getStats();
        const pending = await service.countPending();
        res.write(`data: ${JSON.stringify({ stats, pending })}\n\n`);
      } catch {
        // Silencieux : le client reconnectera automatiquement.
      }
    };

    push();
    const interval = setInterval(push, 15_000);

    req.on('close', () => clearInterval(interval));
  });

  // Accès au fichier : URL signée de 10 minutes, chaque consultation journalisée.
  router.get('/requests/:id/justificatif', review, (req, res) =>
    controller.justificatifUrl(req as any, res));

  router.post('/requests/:id/review', review, (req, res) => controller.takeReview(req as any, res));
  router.post('/requests/:id/assign', review, (req, res) => controller.assign(req as any, res));
  router.post('/requests/:id/approve', review, (req, res) => controller.approve(req as any, res));
  router.post('/requests/:id/reject', review, (req, res) => controller.reject(req as any, res));
  router.post('/requests/:id/request-info', review, (req, res) =>
    controller.requestMoreInfo(req as any, res));

  router.post('/requests/bulk', review, (req, res) => controller.bulk(req as any, res));

  return router;
};
