import { Router } from 'express';
import { ReferencesController } from './references.controller';
import { authGuard, adminGuard } from '../../middleware/auth.guard';
import { cache } from '../../middleware/cache.middleware';

export const createReferencesRoutes = (referencesController: ReferencesController): Router => {
  const router = Router();

  // Universites
  /**
   * @swagger
   * /api/references/universites:
   *   get:
   *     summary: Liste des universités
   *     tags: [Referentiels]
   *     responses:
   *       200:
   *         description: Liste des universités
   */
  router.get('/universites', cache('ref:univ', 600), (req, res) => referencesController.listUniversites(req, res));
  router.post('/universites', authGuard, adminGuard, (req, res) => referencesController.createUniversite(req, res));
  router.put('/universites/:id', authGuard, adminGuard, (req, res) => referencesController.updateUniversite(req, res));
  router.delete('/universites/:id', authGuard, adminGuard, (req, res) => referencesController.deleteUniversite(req, res));

  // Filieres
  /**
   * @swagger
   * /api/references/filieres:
   *   get:
   *     summary: Liste des filières
   *     tags: [Referentiels]
   *     responses:
   *       200:
   *         description: Liste des filières
   */
  router.get('/filieres', cache('ref:filieres', 600), (req, res) => referencesController.listFilieres(req, res));
  router.post('/filieres', authGuard, adminGuard, (req, res) => referencesController.createFiliere(req, res));
  router.put('/filieres/:id', authGuard, adminGuard, (req, res) => referencesController.updateFiliere(req, res));
  router.delete('/filieres/:id', authGuard, adminGuard, (req, res) => referencesController.deleteFiliere(req, res));

  // Matieres
  /**
   * @swagger
   * /api/references/matieres:
   *   get:
   *     summary: Liste des matières
   *     tags: [Referentiels]
   *     responses:
   *       200:
   *         description: Liste des matières
   */
  router.get('/matieres', cache('ref:matieres', 600), (req, res) => referencesController.listMatieres(req, res));
  router.post('/matieres', authGuard, adminGuard, (req, res) => referencesController.createMatiere(req, res));
  router.put('/matieres/:id', authGuard, adminGuard, (req, res) => referencesController.updateMatiere(req, res));
  router.delete('/matieres/:id', authGuard, adminGuard, (req, res) => referencesController.deleteMatiere(req, res));

  return router;
};
