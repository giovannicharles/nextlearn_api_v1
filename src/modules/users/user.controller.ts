import { Request, Response } from 'express';
import { UserService } from './user.service';
import { updateProfileSchema, changePinSchema } from './dto/index';
import { successResponse } from '../../shared/http/response';
import { AuthRequest } from '../../middleware/auth.guard';

export class UserController {
  constructor(private userService: UserService) {}

  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const result = await this.userService.getProfileWithStats(userId);
    successResponse(res, result);
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const validatedData = updateProfileSchema.parse(req.body);
    const result = await this.userService.updateProfile(userId, validatedData);
    successResponse(res, { user: result });
  }

  async updateLanguage(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const { langue } = req.body;
    const result = await this.userService.updateLanguage(userId, langue);
    successResponse(res, { user: result });
  }

  async updateAvatar(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const { avatarUrl } = req.body;
    const result = await this.userService.updateAvatar(userId, avatarUrl);
    successResponse(res, { user: result });
  }

  async changePin(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const validatedData = changePinSchema.parse(req.body);
    await this.userService.changePin(userId, validatedData.currentPin, validatedData.newPin);
    successResponse(res, { message: 'PIN modifié avec succès' });
  }

  async updateFcmToken(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const { fcmToken } = req.body;
    await this.userService.updateFcmToken(userId, fcmToken);
    successResponse(res, { message: 'FCM token mis à jour' });
  }

  async deleteAccount(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    await this.userService.deleteAccount(userId);
    successResponse(res, { message: 'Compte supprimé' });
  }

  async listUsers(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 20, search } = req.query;
    const result = await this.userService.listUsers({ page: Number(page), limit: Number(limit), search: search as string });
    successResponse(res, result);
  }
}
