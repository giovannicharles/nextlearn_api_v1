import { Router } from 'express';
import { ReferencesController } from './references.controller';
import { authGuard, adminGuard } from '../../middleware/auth.guard';
import { cache } from '../../middleware/cache.middleware';

export const createReferencesRoutes = (referencesController: ReferencesController): Router => {
  const router = Router();

  // Types de documents
  /**
   * @swagger
   * /api/references/document-types:
   *   get:
   *     summary: Catalogue des types de documents publiables (source unique)
   *     tags: [References]
   *     responses:
   *       200:
   *         description: Liste { value, label, collection }
   */
  router.get('/document-types', cache('ref:doctypes', 600), (req, res) => referencesController.listDocumentTypes(req, res));

  /**
   * @swagger
   * /api/references/justificatif-types:
   *   get:
   *     summary: Types de justificatifs acceptés pour la vérification académique
   *     tags: [References]
   *     responses:
   *       200:
   *         description: Liste { value, label, description }
   */
  router.get('/justificatif-types', cache('ref:justiftypes', 600), (req, res) => referencesController.listJustificatifTypes(req, res));

  /**
   * @swagger
   * /api/references/motifs-rejet:
   *   get:
   *     summary: Motifs de rejet standards proposés aux réviseurs
   *     tags: [References]
   *     responses:
   *       200:
   *         description: Liste { code, label, texteObligatoire }
   */
  router.get('/motifs-rejet', cache('ref:motifs', 600), (req, res) => referencesController.listMotifsRejet(req, res));

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
  router.get('/filieres', (req, res) => referencesController.listFilieres(req, res));
  router.post('/filieres', authGuard, adminGuard, (req, res) => referencesController.createFiliere(req, res));
  router.put('/filieres/:id', authGuard, adminGuard, (req, res) => referencesController.updateFiliere(req, res));
  router.delete('/filieres/:id', authGuard, adminGuard, (req, res) => referencesController.deleteFiliere(req, res));

  // Niveaux d'une filière (pour les dropdowns en cascade)
  router.get('/niveaux', (req, res) => referencesController.listNiveaux(req, res));

  /**
   * @swagger
   * /api/references/cycles:
   *   get:
   *     summary: Cycles ouverts, filtrés par université (2ᵉ étage de la cascade)
   *     tags: [References]
   *     parameters:
   *       - in: query
   *         name: universiteId
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Liste { value, label, niveaux }
   */
  router.get('/cycles', (req, res) => referencesController.listCycles(req, res));

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
  router.get('/matieres', (req, res) => referencesController.listMatieres(req, res));
  router.post('/matieres', authGuard, adminGuard, (req, res) => referencesController.createMatiere(req, res));
  router.put('/matieres/:id', authGuard, adminGuard, (req, res) => referencesController.updateMatiere(req, res));
  router.delete('/matieres/:id', authGuard, adminGuard, (req, res) => referencesController.deleteMatiere(req, res));

  // Enseignants
  router.get('/enseignants', (req, res) => referencesController.listEnseignants(req, res));
  router.post('/enseignants', authGuard, adminGuard, (req, res) => referencesController.createEnseignant(req, res));
  router.put('/enseignants/:id', authGuard, adminGuard, (req, res) => referencesController.updateEnseignant(req, res));
  router.delete('/enseignants/:id', authGuard, adminGuard, (req, res) => referencesController.deleteEnseignant(req, res));

  return router;
};
