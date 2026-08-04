import { Notification } from '../../models/index';
import { INotificationRepository } from '../../modules/notifications/domain/notification.repository.interface';
import { NotFoundError } from '../../shared/errors/index';

export class NotificationRepository implements INotificationRepository {
  async create(data: Partial<any>): Promise<any> {
    return await Notification.create(data);
  }

  async listUserNotifications(userId: string, options: any): Promise<{ notifications: any[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Notification.countDocuments({ userId }),
    ]);

    return { notifications, total };
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { lu: true, dateLecture: new Date() },
      { new: true }
    ).exec();
    if (!notification) throw new NotFoundError('Notification');
  }

  async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany({ userId, lu: false }, { lu: true, dateLecture: new Date() }).exec();
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    const notification = await Notification.findOneAndDelete({ _id: id, userId }).exec();
    if (!notification) throw new NotFoundError('Notification');
  }

  async countUnread(userId: string): Promise<number> {
    return await Notification.countDocuments({ userId, lu: false }).exec();
  }
}
