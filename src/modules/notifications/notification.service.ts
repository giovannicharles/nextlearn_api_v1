import { INotificationRepository } from './domain/notification.repository.interface';
import { parsePagination, createPaginationMeta } from '../../shared/utils/pagination';

export class NotificationService {
  constructor(private notificationRepository: INotificationRepository) {}

  async createNotification(userId: string, type: string, title: string, message: string, data?: any) {
    return await this.notificationRepository.create({
      userId,
      type: type as any,
      titre: title,
      message,
      data,
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
}
