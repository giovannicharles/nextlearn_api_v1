import { Router } from 'express';
import multer from 'multer';
import { authGuard, adminGuard, permissionGuard } from '../../middleware/auth.guard';
import { DocumentController } from '../documents/document.controller';
import { EpreuveController } from '../epreuves/epreuve.controller';
import { QuizController } from '../quiz/quiz.controller';
import { ReferencesController } from '../references/references.controller';
import { UserController } from '../users/user.controller';
import { NotificationController } from '../notifications/notification.controller';
import { AdminContentController } from './admin-content.controller';
import { AdminContentService } from './admin-content.service';
import { invalidateCache } from '../../middleware/cache.middleware';
import { activityLogService } from './activity-log.service';
import { Document as DocumentModel } from '../../models/index';
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
  notificationController: NotificationController,
): Router => {
  const router = Router();

  // All admin routes require auth + admin:access permission
  router.use(authGuard, adminGuard);

  const contentService = new AdminContentService();
  const contentController = new AdminContentController(contentService);

  // ==================== Dashboard ====================
  router.get('/dashboard/stats', permissionGuard('admin:dashboard'), (req, res) => userController.adminGetStats(req as any, res));
  router.get('/dashboard/content-overview', permissionGuard('admin:dashboard'), (req, res) => contentController.contentOverview(req as any, res));

  // ==================== Reports ====================
  router.get('/reports', permissionGuard('admin:dashboard'), (req, res) => userController.adminGetReports(req as any, res));

  // ==================== Activities ====================
  router.get('/activities/stats', permissionGuard('admin:dashboard'), (req, res) => userController.adminGetActivityStats(req as any, res));
  router.get('/activities', permissionGuard('admin:dashboard'), (req, res) => userController.adminListActivities(req as any, res));

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
  router.get('/documents', permissionGuard('document:read'), (req, res) => contentController.listDocuments(req as any, res));
  router.get('/documents/:id', permissionGuard('document:read'), (req, res) => contentController.getDocument(req as any, res));
  router.patch('/documents/:id/toggle-active', permissionGuard('document:update'), async (req, res) => {
    await contentController.toggleDocumentActive(req as any, res);
    await invalidateCache('docs:*');
  });
  router.post('/documents/bulk', permissionGuard('document:update'), async (req, res) => {
    await contentController.bulkDocumentAction(req as any, res);
    await invalidateCache('docs:*');
  });

  router.post('/documents', permissionGuard('document:create'), upload.single('file'), async (req, res) => {
    await documentController.createDocument(req, res);
    await invalidateCache('docs:*');
    await activityLogService.log(
      'DOCUMENT_CREATED',
      await activityLogService.resolveActor((req as any).user.id),
      { type: 'document', id: '', name: req.body?.titre },
      req.ip
    );
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
  // upload.single('file') indispensable : l'admin envoie un multipart/form-data
  // (le formulaire permet de remplacer le PDF). Sans ce parseur, req.body était
  // vide → findByIdAndUpdate(id, {}) → modification silencieusement ignorée
  // alors que l'API répondait 200 et que l'UI affichait « Document modifié ».
  router.put('/documents/:id', permissionGuard('document:update'), upload.single('file'), async (req, res) => {
    await documentController.updateDocument(req, res);
    await invalidateCache('docs:*');
    await activityLogService.log(
      'DOCUMENT_UPDATED',
      await activityLogService.resolveActor((req as any).user.id),
      { type: 'document', id: String(req.params.id), name: req.body?.titre },
      req.ip
    );
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
  router.delete('/documents/:id', permissionGuard('document:delete'), async (req, res) => {
    const doc = await DocumentModel.findById(req.params.id).select('titre').lean();
    await documentController.deleteDocument(req, res);
    await invalidateCache('docs:*');
    await activityLogService.log(
      'DOCUMENT_DELETED',
      await activityLogService.resolveActor((req as any).user.id),
      { type: 'document', id: String(req.params.id), name: doc?.titre },
      req.ip
    );
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
  router.get('/epreuves', permissionGuard('epreuve:read'), (req, res) => contentController.listEpreuves(req as any, res));
  router.get('/epreuves/:id', permissionGuard('epreuve:read'), (req, res) => contentController.getEpreuve(req as any, res));
  router.patch('/epreuves/:id/toggle-active', permissionGuard('epreuve:update'), async (req, res) => {
    await contentController.toggleEpreuveActive(req as any, res);
    await invalidateCache('epreuves:*');
  });
  router.post('/epreuves/bulk', permissionGuard('epreuve:update'), async (req, res) => {
    await contentController.bulkEpreuveAction(req as any, res);
    await invalidateCache('epreuves:*');
  });

  router.post('/epreuves', permissionGuard('epreuve:create'), upload.fields([
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
  router.put('/epreuves/:id', permissionGuard('epreuve:update'), async (req, res) => {
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
  router.delete('/epreuves/:id', permissionGuard('epreuve:delete'), async (req, res) => {
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
  router.get('/quiz', permissionGuard('quiz:read'), (req, res) => contentController.listQuizzes(req as any, res));
  router.get('/quiz/:id', permissionGuard('quiz:read'), (req, res) => contentController.getQuiz(req as any, res));
  router.get('/quiz/:id/full', permissionGuard('quiz:read'), (req, res) => contentController.getQuizWithQuestions(req as any, res));
  router.patch('/quiz/:id/toggle-active', permissionGuard('quiz:update'), (req, res) => contentController.toggleQuizActive(req as any, res));
  router.post('/quiz/bulk', permissionGuard('quiz:update'), (req, res) => contentController.bulkQuizAction(req as any, res));
  router.get('/quiz/:quizId/questions', permissionGuard('quiz:read'), (req, res) => contentController.listQuestions(req as any, res));
  router.put('/quiz/questions/:id', permissionGuard('quiz:update'), (req, res) => contentController.updateQuestion(req as any, res));

  router.post('/quiz', permissionGuard('quiz:create'), (req, res) => quizController.createQuiz(req, res));

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
  router.put('/quiz/:id', permissionGuard('quiz:update'), (req, res) => quizController.updateQuiz(req, res));

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
  router.delete('/quiz/:id', permissionGuard('quiz:delete'), (req, res) => quizController.deleteQuiz(req, res));

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
  router.post('/quiz/questions', permissionGuard('quiz:create'), (req, res) => quizController.addQuestion(req, res));

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
  router.delete('/quiz/questions/:id', permissionGuard('quiz:delete'), (req, res) => quizController.deleteQuestion(req, res));

  // ==================== Enseignants ====================
  router.get('/enseignants', permissionGuard('reference:read'), (req, res) => contentController.listEnseignants(req as any, res));
  router.post('/enseignants', permissionGuard('reference:create'), (req, res) => contentController.createEnseignant(req as any, res));
  router.put('/enseignants/:id', permissionGuard('reference:update'), (req, res) => contentController.updateEnseignant(req as any, res));
  router.delete('/enseignants/:id', permissionGuard('reference:delete'), (req, res) => contentController.deleteEnseignant(req as any, res));

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
  router.post('/references/universites', permissionGuard('reference:create'), async (req, res) => {
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
  router.put('/references/universites/:id', permissionGuard('reference:update'), async (req, res) => {
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
  router.delete('/references/universites/:id', permissionGuard('reference:delete'), async (req, res) => {
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
  router.post('/references/filieres', permissionGuard('reference:create'), async (req, res) => {
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
  router.put('/references/filieres/:id', permissionGuard('reference:update'), async (req, res) => {
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
  router.delete('/references/filieres/:id', permissionGuard('reference:delete'), async (req, res) => {
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
  router.post('/references/matieres', permissionGuard('reference:create'), async (req, res) => {
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
  router.put('/references/matieres/:id', permissionGuard('reference:update'), async (req, res) => {
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
  router.delete('/references/matieres/:id', permissionGuard('reference:delete'), async (req, res) => {
    await referencesController.deleteMatiere(req, res);
    await invalidateCache('ref:*');
  });

  // ==================== Users ====================
  router.get('/users', permissionGuard('user:read'), (req, res) => userController.adminListUsers(req as any, res));
  router.post('/users', permissionGuard('user:create'), (req, res) => userController.adminCreateUser(req as any, res));
  router.get('/users/:id', permissionGuard('user:read'), (req, res) => userController.adminGetUserDetail(req as any, res));
  router.put('/users/:id', permissionGuard('user:update'), (req, res) => userController.adminUpdateUser(req as any, res));
  router.put('/users/:id/role', permissionGuard('user:role:change'), (req, res) => userController.adminUpdateUserRole(req as any, res));
  router.post('/users/:id/suspend', permissionGuard('user:suspend'), (req, res) => userController.adminSuspendUser(req as any, res));
  router.post('/users/:id/ban', permissionGuard('user:suspend'), (req, res) => userController.adminBanUser(req as any, res));
  router.post('/users/:id/activate', permissionGuard('user:suspend'), (req, res) => userController.adminActivateUser(req as any, res));
  router.post('/users/:id/premium', permissionGuard('user:update'), (req, res) => userController.adminTogglePremium(req as any, res));
  router.post('/users/bulk', permissionGuard('user:suspend'), (req, res) => userController.adminBulkAction(req as any, res));
  router.delete('/users/:id', permissionGuard('user:delete'), (req, res) => userController.adminDeleteUser(req as any, res));

  // ==================== Notifications ====================
  router.get('/notifications', permissionGuard('notification:read'), (req, res) => notificationController.adminListAll(req as any, res));
  router.post('/notifications/broadcast', permissionGuard('notification:send'), (req, res) => notificationController.adminBroadcast(req as any, res));

  return router;
};
