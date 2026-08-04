import { Router } from 'express';
import { FavoriteController } from './favorite.controller';
import { authGuard } from '../../middleware/auth.guard';

export const createFavoriteRoutes = (favoriteController: FavoriteController): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/favorites/{documentId}:
   *   post:
   *     summary: Ajouter un document aux favoris
   *     tags: [Favorites]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: documentId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       201:
   *         description: Favori ajouté
   */
  router.post('/:documentId', authGuard, (req, res) => favoriteController.addFavorite(req, res));
  /**
   * @swagger
   * /api/favorites/{documentId}:
   *   delete:
   *     summary: Retirer un document des favoris
   *     tags: [Favorites]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: documentId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Favori retiré
   */
  router.delete('/:documentId', authGuard, (req, res) => favoriteController.removeFavorite(req, res));
  /**
   * @swagger
   * /api/favorites:
   *   get:
   *     summary: Liste des documents favoris
   *     tags: [Favorites]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des favoris
   */
  router.get('/', authGuard, (req, res) => favoriteController.listFavorites(req, res));
  /**
   * @swagger
   * /api/favorites/check/{documentId}:
   *   get:
   *     summary: Vérifier si un document est en favori
   *     tags: [Favorites]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: documentId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: isFavorite (booléen)
   */
  router.get('/check/:documentId', authGuard, (req, res) => favoriteController.checkFavorite(req, res));

  return router;
};
