// src/modules/activity/activity.service.js
const Activity = require('./activity.model');

class ActivityService {

    async log({ action, targetType, targetId, targetName, performedBy, metadata, req }) {
        try {
            const name = performedBy.name || `${performedBy.nom || ''} ${performedBy.prenom || ''}`.trim();
            await Activity.create({
                action, targetType,
                targetId:   targetId || null,
                targetName: targetName || null,
                performedBy: {
                    id:    String(performedBy.id || performedBy._id),
                    name:  name || 'Inconnu',
                    email: performedBy.email,
                    role:  performedBy.role,
                },
                metadata:  metadata || {},
                ipAddress: req?.headers?.['x-forwarded-for']?.split(',')[0] || req?.ip || null,
                userAgent: req?.headers?.['user-agent'] || null,
            });
        } catch (e) {
            console.error('⚠️  Activity log failed:', e.message);
        }
    }

    async findAll({ page = 1, limit = 25, action, targetType, search, startDate, endDate } = {}) {
        const query = {};
        if (action)     query.action     = action;
        if (targetType) query.targetType = targetType;
        if (search) {
            const r = new RegExp(search, 'i');
            query.$or = [{ 'performedBy.name': r }, { 'performedBy.email': r }, { targetName: r }];
        }
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate)   query.createdAt.$lte = new Date(new Date(endDate).setHours(23,59,59,999));
        }

        const skip  = (Number(page) - 1) * Number(limit);
        const total = await Activity.countDocuments(query);
        const items = await Activity.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean();

        return { items, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) || 1 };
    }

    async getStats() {
        const now   = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const week  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [todayCount, weekCount, total, byAction] = await Promise.all([
            Activity.countDocuments({ createdAt: { $gte: today } }),
            Activity.countDocuments({ createdAt: { $gte: week  } }),
            Activity.countDocuments(),
            Activity.aggregate([
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort:  { count: -1 } },
            ]),
        ]);

        return { todayCount, weekCount, total, byAction };
    }
}

module.exports = new ActivityService();
