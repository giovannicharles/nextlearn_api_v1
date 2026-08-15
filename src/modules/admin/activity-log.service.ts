import { ActivityLog, User } from '../../models/index';

export interface LogActor {
  id: string;
  name: string;
  email: string;
}

export class ActivityLogService {
  async resolveActor(userId: string): Promise<LogActor> {
    const admin = await User.findById(userId).select('nom prenom email').lean();
    return {
      id: userId,
      name: admin ? `${admin.prenom} ${admin.nom}` : userId,
      email: admin?.email || '',
    };
  }

  async log(
    action: string,
    performedBy: LogActor,
    target?: { type: string; id: string; name?: string },
    ipAddress?: string
  ): Promise<void> {
    await ActivityLog.create({
      action,
      performedBy,
      targetType: target?.type,
      targetId: target?.id,
      targetName: target?.name,
      ipAddress,
    });
  }

  async list(filters: {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    targetType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    const { page = 1, limit = 25, search, action, targetType, startDate, endDate } = filters;
    const query: any = {};
    if (action) query.action = action;
    if (targetType) query.targetType = targetType;
    if (search) {
      query.$or = [
        { 'performedBy.name': { $regex: search, $options: 'i' } },
        { 'performedBy.email': { $regex: search, $options: 'i' } },
        { targetName: { $regex: search, $options: 'i' } },
      ];
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      ActivityLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      ActivityLog.countDocuments(query),
    ]);

    return {
      items,
      total,
      page: Number(page),
      pages: Math.max(1, Math.ceil(total / Number(limit))),
    };
  }

  async stats(): Promise<any> {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [todayCount, weekCount, total, byAction] = await Promise.all([
      ActivityLog.countDocuments({ createdAt: { $gte: todayStart } }),
      ActivityLog.countDocuments({ createdAt: { $gte: weekStart } }),
      ActivityLog.countDocuments(),
      ActivityLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return { todayCount, weekCount, total, byAction };
  }

  async recent(limit = 8): Promise<any> {
    return ActivityLog.find().sort({ createdAt: -1 }).limit(limit).lean();
  }
}

export const activityLogService = new ActivityLogService();
