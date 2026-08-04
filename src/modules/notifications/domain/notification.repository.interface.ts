import { INotification } from '../../../models/index';

export interface INotificationRepository {
  create(data: Partial<INotification>): Promise<INotification>;
  listUserNotifications(userId: string, options: any): Promise<{ notifications: INotification[]; total: number }>;
  markAsRead(id: string, userId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  deleteNotification(id: string, userId: string): Promise<void>;
  countUnread(userId: string): Promise<number>;
}
