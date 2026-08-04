import { Response } from 'express';
import { NotificationService } from './notification.service';
import { successResponse } from '../../shared/http/response';
import { AuthRequest } from '../../middleware/auth.guard';

export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  async listNotifications(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const { page, limit } = req.query;
    const result = await this.notificationService.listUserNotifications(userId, { page: Number(page), limit: Number(limit) });
    successResponse(res, result.data, 200, result.meta);
  }

  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const id = String(req.params.id);
    await this.notificationService.markAsRead(id, userId);
    successResponse(res, { message: 'Notification marquée comme lue' });
  }

  async markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    await this.notificationService.markAllAsRead(userId);
    successResponse(res, { message: 'Toutes les notifications marquées comme lues' });
  }

  async countUnread(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const count = await this.notificationService.countUnread(userId);
    successResponse(res, { count });
  }

  async deleteNotification(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    const id = String(req.params.id);
    await this.notificationService.deleteNotification(id, userId);
    successResponse(res, { message: 'Notification supprimée' });
  }
}
