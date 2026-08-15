import { Request, Response } from 'express';
import { UserService } from './user.service';
import { updateProfileSchema, changePinSchema } from './dto/index';
import { successResponse } from '../../shared/http/response';
import { AuthRequest } from '../../middleware/auth.guard';
import { activityLogService } from '../admin/activity-log.service';

const resolveActor = (req: AuthRequest) => activityLogService.resolveActor(req.user!.id);

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

  async adminListUsers(req: AuthRequest, res: Response): Promise<void> {
    const { page, limit, search, role, status, classe } = req.query;
    const result = await this.userService.adminListUsers({ page, limit, search, role, status, classe });
    successResponse(res, result);
  }

  async adminUpdateUserRole(req: AuthRequest, res: Response): Promise<void> {
    const userId = String(req.params.id);
    const { role } = req.body;
    const target = await this.userService.adminGetUserDetail(userId).catch(() => null);
    const result = await this.userService.adminUpdateUserRole(userId, role);
    await activityLogService.log(
      'ROLE_CHANGED',
      await resolveActor(req),
      { type: 'user', id: userId, name: target ? `${target.user.nom} ${target.user.prenom}` : userId },
      req.ip
    );
    successResponse(res, result);
  }

  async adminSuspendUser(req: AuthRequest, res: Response): Promise<void> {
    const userId = String(req.params.id);
    const { reason, untilDate } = req.body;
    const target = await this.userService.adminGetUserDetail(userId).catch(() => null);
    const result = await this.userService.adminSuspendUser(userId, reason, untilDate ? new Date(untilDate) : undefined);
    await activityLogService.log(
      'USER_BLOCKED',
      await resolveActor(req),
      { type: 'user', id: userId, name: target ? `${target.user.nom} ${target.user.prenom}` : userId },
      req.ip
    );
    successResponse(res, result);
  }

  async adminBanUser(req: AuthRequest, res: Response): Promise<void> {
    const userId = String(req.params.id);
    const { reason } = req.body;
    const target = await this.userService.adminGetUserDetail(userId).catch(() => null);
    const result = await this.userService.adminBanUser(userId, reason);
    await activityLogService.log(
      'USER_BLOCKED',
      await resolveActor(req),
      { type: 'user', id: userId, name: target ? `${target.user.nom} ${target.user.prenom}` : userId },
      req.ip
    );
    successResponse(res, result);
  }

  async adminActivateUser(req: AuthRequest, res: Response): Promise<void> {
    const userId = String(req.params.id);
    const target = await this.userService.adminGetUserDetail(userId).catch(() => null);
    const result = await this.userService.adminActivateUser(userId);
    await activityLogService.log(
      'USER_UNBLOCKED',
      await resolveActor(req),
      { type: 'user', id: userId, name: target ? `${target.user.nom} ${target.user.prenom}` : userId },
      req.ip
    );
    successResponse(res, result);
  }

  async adminTogglePremium(req: AuthRequest, res: Response): Promise<void> {
    const userId = String(req.params.id);
    const result = await this.userService.adminTogglePremium(userId);
    successResponse(res, result);
  }

  async adminDeleteUser(req: AuthRequest, res: Response): Promise<void> {
    const userId = String(req.params.id);
    const target = await this.userService.adminGetUserDetail(userId).catch(() => null);
    await this.userService.adminDeleteUser(userId);
    await activityLogService.log(
      'USER_DELETED',
      await resolveActor(req),
      { type: 'user', id: userId, name: target ? `${target.user.nom} ${target.user.prenom}` : userId },
      req.ip
    );
    successResponse(res, { message: 'Utilisateur supprimé' });
  }

  async adminCreateUser(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.userService.adminCreateUser(req.body);
    await activityLogService.log(
      'USER_CREATED',
      await resolveActor(req),
      { type: 'user', id: String(result.id), name: `${result.nom} ${result.prenom}` },
      req.ip
    );
    successResponse(res, result, 201);
  }

  async adminUpdateUser(req: AuthRequest, res: Response): Promise<void> {
    const userId = String(req.params.id);
    const result = await this.userService.adminUpdateUser(userId, req.body);
    await activityLogService.log(
      'USER_UPDATED',
      await resolveActor(req),
      { type: 'user', id: userId, name: `${result.nom} ${result.prenom}` },
      req.ip
    );
    successResponse(res, result);
  }

  async adminGetStats(_req: AuthRequest, res: Response): Promise<void> {
    const stats = await this.userService.adminGetStats();
    successResponse(res, stats);
  }

  async adminGetUserDetail(req: AuthRequest, res: Response): Promise<void> {
    const userId = String(req.params.id);
    const result = await this.userService.adminGetUserDetail(userId);
    successResponse(res, result);
  }

  async adminBulkAction(req: AuthRequest, res: Response): Promise<void> {
    const { action, userIds, reason } = req.body;
    const result = await this.userService.adminBulkAction(action, userIds, reason);
    successResponse(res, result);
  }

  async adminGetReports(req: AuthRequest, res: Response): Promise<void> {
    const period = Number(req.query.period) || 30;
    const result = await this.userService.adminGetReports(period);
    successResponse(res, result);
  }

  async adminListActivities(req: AuthRequest, res: Response): Promise<void> {
    const { page, limit, search, action, targetType, startDate, endDate } = req.query;
    const result = await activityLogService.list({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
      action: action as string,
      targetType: targetType as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    successResponse(res, result);
  }

  async adminGetActivityStats(_req: AuthRequest, res: Response): Promise<void> {
    const result = await activityLogService.stats();
    successResponse(res, result);
  }
}
