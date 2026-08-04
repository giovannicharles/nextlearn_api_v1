import { Router } from 'express';
import multer from 'multer';
import { authGuard, adminGuard } from '../../middleware/auth.guard';
import { DocumentController } from '../documents/document.controller';
import { EpreuveController } from '../epreuves/epreuve.controller';
import { QuizController } from '../quiz/quiz.controller';
import { ReferencesController } from '../references/references.controller';
import { UserController } from '../users/user.controller';
import { invalidateCache } from '../../middleware/cache.middleware';
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

export const createAdminRoutes = (
  documentController: DocumentController,
  epreuveController: EpreuveController,
  quizController: QuizController,
  referencesController: ReferencesController,
  userController: UserController,
): Router => {
  const router = Router();

  // All admin routes require auth + admin role
  router.use(authGuard, adminGuard);

  // ==================== Documents ====================
  /**
   * @swagger
   * /api/admin/documents:
   *   post:
   *     summary: Créer un document (upload PDF)
   *     tags: [Admin]
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
  router.post('/documents', upload.single('file'), async (req, res) => {
    await documentController.createDocument(req, res);
    await invalidateCache('docs:*');
  });

  /**
   * @swagger
   * /api/admin/documents/{id}:
   *   put:
   *     summary: Modifier un document
   *     tags: [Admin]
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
  router.put('/documents/:id', async (req, res) => {
    await documentController.updateDocument(req, res);
    await invalidateCache('docs:*');
  });

  /**
   * @swagger
   * /api/admin/documents/{id}:
   *   delete:
   *     summary: Supprimer un document (soft delete)
   *     tags: [Admin]
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
  router.delete('/documents/:id', async (req, res) => {
    await documentController.deleteDocument(req, res);
    await invalidateCache('docs:*');
  });

  // ==================== Epreuves ====================
  /**
   * @swagger
   * /api/admin/epreuves:
   *   post:
   *     summary: Créer une épreuve
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Épreuve créée
   */
  router.post('/epreuves', upload.fields([
    { name: 'epreuve', maxCount: 1 },
    { name: 'corrige', maxCount: 1 },
  ]), async (req, res) => {
    await epreuveController.createEpreuve(req, res);
    await invalidateCache('epreuves:*');
  });

  /**
   * @swagger
   * /api/admin/epreuves/{id}:
   *   put:
   *     summary: Modifier une épreuve
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Épreuve mise à jour
   */
  router.put('/epreuves/:id', async (req, res) => {
    await epreuveController.updateEpreuve(req, res);
    await invalidateCache('epreuves:*');
  });

  /**
   * @swagger
   * /api/admin/epreuves/{id}:
   *   delete:
   *     summary: Supprimer une épreuve
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Épreuve supprimée
   */
  router.delete('/epreuves/:id', async (req, res) => {
    await epreuveController.deleteEpreuve(req, res);
    await invalidateCache('epreuves:*');
  });

  // ==================== Quiz ====================
  /**
   * @swagger
   * /api/admin/quiz:
   *   post:
   *     summary: Créer un quiz
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Quiz créé
   */
  router.post('/quiz', (req, res) => quizController.createQuiz(req, res));

  /**
   * @swagger
   * /api/admin/quiz/{id}:
   *   put:
   *     summary: Modifier un quiz
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Quiz mis à jour
   */
  router.put('/quiz/:id', (req, res) => quizController.updateQuiz(req, res));

  /**
   * @swagger
   * /api/admin/quiz/{id}:
   *   delete:
   *     summary: Supprimer un quiz
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Quiz supprimé
   */
  router.delete('/quiz/:id', (req, res) => quizController.deleteQuiz(req, res));

  /**
   * @swagger
   * /api/admin/quiz/questions:
   *   post:
   *     summary: Ajouter une question à un quiz
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Question ajoutée
   */
  router.post('/quiz/questions', (req, res) => quizController.addQuestion(req, res));

  /**
   * @swagger
   * /api/admin/quiz/questions/{id}:
   *   delete:
   *     summary: Supprimer une question
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Question supprimée
   */
  router.delete('/quiz/questions/:id', (req, res) => quizController.deleteQuestion(req, res));

  // ==================== References ====================
  /**
   * @swagger
   * /api/admin/references/universites:
   *   post:
   *     summary: Créer une université
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Université créée
   */
  router.post('/references/universites', async (req, res) => {
    await referencesController.createUniversite(req, res);
    await invalidateCache('ref:*');
  });

  /**
   * @swagger
   * /api/admin/references/universites/{id}:
   *   put:
   *     summary: Modifier une université
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Université mise à jour
   */
  router.put('/references/universites/:id', async (req, res) => {
    await referencesController.updateUniversite(req, res);
    await invalidateCache('ref:*');
  });

  /**
   * @swagger
   * /api/admin/references/universites/{id}:
   *   delete:
   *     summary: Supprimer une université
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Université supprimée
   */
  router.delete('/references/universites/:id', async (req, res) => {
    await referencesController.deleteUniversite(req, res);
    await invalidateCache('ref:*');
  });

  /**
   * @swagger
   * /api/admin/references/filieres:
   *   post:
   *     summary: Créer une filière
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Filière créée
   */
  router.post('/references/filieres', async (req, res) => {
    await referencesController.createFiliere(req, res);
    await invalidateCache('ref:*');
  });

  /**
   * @swagger
   * /api/admin/references/filieres/{id}:
   *   put:
   *     summary: Modifier une filière
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Filière mise à jour
   */
  router.put('/references/filieres/:id', async (req, res) => {
    await referencesController.updateFiliere(req, res);
    await invalidateCache('ref:*');
  });

  /**
   * @swagger
   * /api/admin/references/filieres/{id}:
   *   delete:
   *     summary: Supprimer une filière
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Filière supprimée
   */
  router.delete('/references/filieres/:id', async (req, res) => {
    await referencesController.deleteFiliere(req, res);
    await invalidateCache('ref:*');
  });

  /**
   * @swagger
   * /api/admin/references/matieres:
   *   post:
   *     summary: Créer une matière
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Matière créée
   */
  router.post('/references/matieres', async (req, res) => {
    await referencesController.createMatiere(req, res);
    await invalidateCache('ref:*');
  });

  /**
   * @swagger
   * /api/admin/references/matieres/{id}:
   *   put:
   *     summary: Modifier une matière
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Matière mise à jour
   */
  router.put('/references/matieres/:id', async (req, res) => {
    await referencesController.updateMatiere(req, res);
    await invalidateCache('ref:*');
  });

  /**
   * @swagger
   * /api/admin/references/matieres/{id}:
   *   delete:
   *     summary: Supprimer une matière
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Matière supprimée
   */
  router.delete('/references/matieres/:id', async (req, res) => {
    await referencesController.deleteMatiere(req, res);
    await invalidateCache('ref:*');
  });

  // ==================== Users ====================
  /**
   * @swagger
   * /api/admin/users:
   *   get:
   *     summary: Liste des utilisateurs (admin)
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des utilisateurs
   */
  router.get('/users', (req, res) => userController.listUsers(req, res));

  return router;
};
