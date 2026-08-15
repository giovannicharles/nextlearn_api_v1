import { INotificationRepository } from './domain/notification.repository.interface';
import { parsePagination, createPaginationMeta } from '../../shared/utils/pagination';
import { Notification, NotificationType, User } from '../../models/index';

export class NotificationService {
  constructor(private notificationRepository: INotificationRepository) {}

  async createNotification(userId: string, type: string, title: string, message: string, data?: any) {
    return await this.notificationRepository.create({
      userId,
      type: type as any,
      titre: title,
      corps: message,
      metadata: data,
      lu: false,
      createdAt: new Date(),
    });
  }

  async listUserNotifications(userId: string, options: any) {
    const { page, limit } = parsePagination(options);
    const { notifications, total } = await this.notificationRepository.listUserNotifications(userId, { page, limit });
    return {
      data: notifications,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async markAsRead(id: string, userId: string) {
    await this.notificationRepository.markAsRead(id, userId);
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.markAllAsRead(userId);
  }

  async deleteNotification(id: string, userId: string) {
    await this.notificationRepository.deleteNotification(id, userId);
  }

  async countUnread(userId: string) {
    return await this.notificationRepository.countUnread(userId);
  }

  async broadcastNotification(data: {
    type: string;
    title: string;
    message: string;
    target?: 'all' | 'active' | 'premium' | 'role';
    role?: string;
    metadata?: any;
  }): Promise<{ sent: number }> {
    const { type, title, message, target = 'all', role, metadata } = data;

    let userQuery: any = {};
    switch (target) {
      case 'active':
        userQuery = { status: 'active' };
        break;
      case 'premium':
        userQuery = { isPremium: true };
        break;
      case 'role':
        userQuery = { role: role || 'user' };
        break;
      default:
        userQuery = {};
    }

    const users = await User.find(userQuery).select('_id').lean();
    if (users.length === 0) {
      return { sent: 0 };
    }

    const notifications = users.map(u => ({
      userId: u._id,
      type: type as any,
      titre: title,
      corps: message,
      metadata: metadata || {},
      lu: false,
      createdAt: new Date(),
    }));

    await Notification.insertMany(notifications);
    return { sent: users.length };
  }

  async adminListAllNotifications(options: any) {
    const { page, limit } = parsePagination(options);
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      Notification.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(),
    ]);
    return {
      data: notifications,
      meta: createPaginationMeta(page, limit, total),
    };
  }
}
