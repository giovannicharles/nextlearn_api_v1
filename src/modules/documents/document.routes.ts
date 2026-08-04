import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from './document.controller';
import { authGuard, adminGuard } from '../../middleware/auth.guard';
import { cache } from '../../middleware/cache.middleware';
import env from '../../config/env';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont autorisés'));
    }
  },
});

export const createDocumentRoutes = (documentController: DocumentController): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/documents:
   *   get:
   *     summary: Liste paginée des documents avec filtres
   *     tags: [Documents]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *       - in: query
   *         name: type
   *         schema: { type: string, enum: [COURS, TD, SYNTHESE] }
   *       - in: query
   *         name: niveau
   *         schema: { type: string, enum: [L1, L2, L3, M1, M2] }
   *       - in: query
   *         name: matiereId
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Liste des documents
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedResponse'
   */
  router.get('/', cache('docs:list', 120), (req, res) => documentController.listDocuments(req, res));
  /**
   * @swagger
   * /api/documents/search:
   *   get:
   *     summary: Recherche full-text de documents
   *     tags: [Documents]
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema: { type: string }
   *         example: algorithmes
   *     responses:
   *       200:
   *         description: Résultats de recherche
   */
  router.get('/search', cache('docs:search', 60), (req, res) => documentController.searchDocuments(req, res));
  /**
   * @swagger
   * /api/documents/recommended:
   *   get:
   *     summary: Documents recommandés (personnalisés selon université/niveau)
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 6 }
   *     responses:
   *       200:
   *         description: Liste de documents recommandés
   */
  router.get('/recommended', authGuard, (req, res) => documentController.getRecommended(req, res));
  /**
   * @swagger
   * /api/documents/popular:
   *   get:
   *     summary: Documents les plus populaires (téléchargements)
   *     tags: [Documents]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *     responses:
   *       200:
   *         description: Liste des documents populaires
   */
  router.get('/popular', cache('docs:popular', 300), (req, res) => documentController.getPopular(req, res));
  /**
   * @swagger
   * /api/documents/recent:
   *   get:
   *     summary: Documents les plus récents
   *     tags: [Documents]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *     responses:
   *       200:
   *         description: Liste des documents récents
   */
  router.get('/recent', cache('docs:recent', 120), (req, res) => documentController.getRecent(req, res));
  /**
   * @swagger
   * /api/documents/{id}:
   *   get:
   *     summary: Détail d'un document
   *     tags: [Documents]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Détail du document
   *       404:
   *         description: Document non trouvé
   */
  router.get('/:id', cache('docs:detail', 300), (req, res) => documentController.getDocumentById(req, res));
  /**
   * @swagger
   * /api/documents/{id}/signed-url:
   *   get:
   *     summary: Générer une URL signée pour accès sécurisé au PDF
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: URL signée (TTL 1h)
   */
  router.get('/:id/signed-url', authGuard, (req, res) => documentController.getSignedUrl(req, res));
  /**
   * @swagger
   * /api/documents/{id}/view:
   *   post:
   *     summary: Incrémenter le compteur de vues
   *     tags: [Documents]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Vue enregistrée
   */
  router.post('/:id/view', (req, res) => documentController.recordView(req, res));
  /**
   * @swagger
   * /api/documents/{id}/download:
   *   post:
   *     summary: Incrémenter téléchargements + générer URL signée
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: URL de téléchargement signée
   */
  router.post('/:id/download', authGuard, (req, res) => documentController.downloadDocument(req, res));
  /**
   * @swagger
   * /api/documents:
   *   post:
   *     summary: Créer un document (upload PDF, admin)
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file: { type: string, format: binary }
   *               titre: { type: string }
   *               description: { type: string }
   *               type: { type: string, enum: [COURS, TD, SYNTHESE] }
   *               matiereId: { type: string }
   *               niveau: { type: string }
   *               anneeAcademique: { type: string }
   *     responses:
   *       201:
   *         description: Document créé
   */
  router.post('/', authGuard, adminGuard, upload.single('file'), (req, res) => documentController.createDocument(req, res));
  /**
   * @swagger
   * /api/documents/{id}:
   *   put:
   *     summary: Modifier un document (admin)
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Document mis à jour
   */
  router.put('/:id', authGuard, adminGuard, (req, res) => documentController.updateDocument(req, res));
  /**
   * @swagger
   * /api/documents/{id}:
   *   delete:
   *     summary: Supprimer un document (admin, soft delete)
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Document supprimé
   */
  router.delete('/:id', authGuard, adminGuard, (req, res) => documentController.deleteDocument(req, res));
  /**
   * @swagger
   * /api/documents/{id}/rate:
   *   post:
   *     summary: Noter un document (1-5)
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [note]
   *             properties:
   *               note: { type: integer, minimum: 1, maximum: 5 }
   *     responses:
   *       200:
   *         description: Note enregistrée
   */
  router.post('/:id/rate', authGuard, (req, res) => documentController.rateDocument(req, res));

  return router;
};
