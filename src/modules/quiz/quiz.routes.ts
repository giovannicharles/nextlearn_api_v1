import { Router } from 'express';
import { QuizController } from './quiz.controller';
import { authGuard, adminGuard } from '../../middleware/auth.guard';

export const createQuizRoutes = (quizController: QuizController): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/quiz:
   *   get:
   *     summary: Liste des quiz (filtrable par document)
   *     tags: [Quiz]
   *     parameters:
   *       - in: query
   *         name: documentId
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Liste des quiz
   */
  router.get('/', (req, res) => quizController.listQuizzes(req, res));
  /**
   * @swagger
   * /api/quiz/{id}:
   *   get:
   *     summary: Détail d'un quiz avec questions (sans bonneReponseIndex)
   *     tags: [Quiz]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Détail du quiz
   */
  router.get('/:id', (req, res) => quizController.getQuizById(req, res));
  /**
   * @swagger
   * /api/quiz:
   *   post:
   *     summary: Créer un quiz (admin)
   *     tags: [Quiz]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Quiz créé
   */
  router.post('/', authGuard, adminGuard, (req, res) => quizController.createQuiz(req, res));
  /**
   * @swagger
   * /api/quiz/{id}:
   *   put:
   *     summary: Modifier un quiz (admin)
   *     tags: [Quiz]
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
  router.put('/:id', authGuard, adminGuard, (req, res) => quizController.updateQuiz(req, res));
  /**
   * @swagger
   * /api/quiz/{id}:
   *   delete:
   *     summary: Supprimer un quiz (admin)
   *     tags: [Quiz]
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
  router.delete('/:id', authGuard, adminGuard, (req, res) => quizController.deleteQuiz(req, res));
  /**
   * @swagger
   * /api/quiz/questions:
   *   post:
   *     summary: Ajouter une question à un quiz (admin)
   *     tags: [Quiz]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Question ajoutée
   */
  router.post('/questions', authGuard, adminGuard, (req, res) => quizController.addQuestion(req, res));
  /**
   * @swagger
   * /api/quiz/questions/{id}:
   *   delete:
   *     summary: Supprimer une question (admin)
   *     tags: [Quiz]
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
  router.delete('/questions/:id', authGuard, adminGuard, (req, res) => quizController.deleteQuestion(req, res));
  /**
   * @swagger
   * /api/quiz/{id}/submit:
   *   post:
   *     summary: Soumettre les réponses d'un quiz et obtenir le score
   *     tags: [Quiz]
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
   *             required: [answers, dureeSecondes]
   *             properties:
   *               answers:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     questionId: { type: string }
   *                     reponseIndex: { type: integer }
   *               dureeSecondes: { type: integer }
   *     responses:
   *       200:
   *         description: score, totalQuestions, details
   */
  router.post('/:id/submit', authGuard, (req, res) => quizController.submitQuiz(req, res));
  /**
   * @swagger
   * /api/quiz/results/me:
   *   get:
   *     summary: Historique des résultats de quiz de l'utilisateur
   *     tags: [Quiz]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des résultats
   */
  router.get('/results/me', authGuard, (req, res) => quizController.listUserResults(req, res));
  /**
   * @swagger
   * /api/quiz/results/{id}:
   *   get:
   *     summary: Détail d'un résultat de quiz
   *     tags: [Quiz]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Détail du résultat
   */
  router.get('/results/:id', authGuard, (req, res) => quizController.getResultById(req, res));

  return router;
};
