// src/modules/admin/admin.controller.js
const User        = require('../user/user.model');
const Document    = require('../document/document.model');
const Activity    = require('../activity/activity.model');
const activitySvc = require('../activity/activity.service');
const bcrypt      = require('bcryptjs');

// ─────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
    try {
        const now   = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const week  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
        const month = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [
            totalUsers, totalDocs,
            newUsersToday, newUsersMonth,
            newDocsWeek,   newDocsMonth,
            docsByType, docsByLevel,
            usersByClasse,
            recentActivities,
            lockedUsers, verifiedUsers,
            userGrowth, docGrowth,
        ] = await Promise.all([
            User.countDocuments(),
            Document.countDocuments(),
            User.countDocuments({ createdAt: { $gte: today } }),
            User.countDocuments({ createdAt: { $gte: month } }),
            Document.countDocuments({ createdAt: { $gte: week  } }),
            Document.countDocuments({ createdAt: { $gte: month } }),
            Document.aggregate([{ $group: { _id: '$type',  count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
            Document.aggregate([{ $group: { _id: '$level', count: { $sum: 1 } } }, { $sort: { _id:   1  } }]),
            User.aggregate([
                { $match: { classe: { $ne: '' } } },
                { $group: { _id: '$classe', count: { $sum: 1 } } },
                { $sort: { count: -1 } }, { $limit: 10 },
            ]),
            Activity.find().sort({ createdAt: -1 }).limit(10).lean(),
            User.countDocuments({ lockUntil: { $gt: new Date() } }),
            User.countDocuments({ isEmailVerified: true }),
            User.aggregate([
                { $match: { createdAt: { $gte: month } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            Document.aggregate([
                { $match: { createdAt: { $gte: month } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
        ]);

        res.json({
            users:     { total: totalUsers, today: newUsersToday, month: newUsersMonth, locked: lockedUsers, verified: verifiedUsers },
            documents: { total: totalDocs,  week:  newDocsWeek,  month: newDocsMonth,  byType: docsByType, byLevel: docsByLevel },
            usersByClasse,
            recentActivities,
            charts: { userGrowth, docGrowth },
        });
    } catch (err) {
        console.error('❌ getDashboardStats:', err);
        res.status(500).json({ error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role, classe, filiere, sort = 'createdAt', order = 'desc' } = req.query;
        const query = {};
        if (role)    query.role    = role;
        if (classe)  query.classe  = classe;
        if (filiere) query.filiere = filiere;
        if (search) {
            const r = new RegExp(search, 'i');
            query.$or = [{ nom: r }, { prenom: r }, { email: r }];
        }
        const sortObj = { [sort]: order === 'asc' ? 1 : -1 };
        const skip    = (Number(page) - 1) * Number(limit);
        const [total, users] = await Promise.all([
            User.countDocuments(query),
            User.find(query).sort(sortObj).skip(skip).limit(Number(limit)).lean()
        ]);
        res.json({ users, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) || 1 });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).lean();
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
        res.json(user);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createUser = async (req, res) => {
    try {
        const { nom, prenom, email, password, role, classe, filiere } = req.body;
        if (!nom || !prenom || !email || !password) return res.status(400).json({ error: 'Champs obligatoires manquants' });
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(409).json({ error: 'Email déjà utilisé' });
        const hashed = await bcrypt.hash(password, 12);
        const user   = await User.create({
            nom, prenom, email: email.toLowerCase(),
            password: hashed, role: role || 'student',
            classe: classe || '', filiere: filiere || '',
            isEmailVerified: true, twoFactorEnabled: true,
        });
        await activitySvc.log({ action: 'USER_CREATED', targetType: 'user', targetId: user._id.toString(), targetName: `${user.nom} ${user.prenom}`, performedBy: req.adminUser, req });
        res.status(201).json(user);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// exports.updateUser = async (req, res) => {
//     try {
//         const allowed = ['nom','prenom','email','role','classe','filiere','bio','isEmailVerified'];
//         const update  = {};
//         allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
//         const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
//         if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
//         await activitySvc.log({ action: 'USER_UPDATED', targetType: 'user', targetId: user._id.toString(), targetName: `${user.nom} ${user.prenom}`, performedBy: req.adminUser, metadata: { fields: Object.keys(update) }, req });
//         res.json(user);
//     } catch (err) { res.status(500).json({ error: err.message }); }
// };
exports.updateUser = async (req, res) => {
    try {
        const allowed = ['nom','prenom','email','role','classe','filiere','bio','isEmailVerified'];
        const update  = {};
        allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
        const user = await User.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after', runValidators: true });
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
        await activitySvc.log({ action: 'USER_UPDATED', targetType: 'user', targetId: user._id.toString(), targetName: `${user.nom} ${user.prenom}`, performedBy: req.adminUser, metadata: { fields: Object.keys(update) }, req });
        res.json(user);
    } catch (err) { res.status(500).json({ error: err.message }); }
};
exports.deleteUser = async (req, res) => {
    try {
        if (req.params.id === req.adminUser.id) return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' });
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
        await activitySvc.log({ action: 'USER_DELETED', targetType: 'user', targetId: req.params.id, targetName: `${user.nom} ${user.prenom}`, performedBy: req.adminUser, req });
        res.json({ message: 'Utilisateur supprimé' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.blockUser = async (req, res) => {
    try {
        const lockUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        const user = await User.findByIdAndUpdate(req.params.id, { lockUntil }, { new: true });
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
        await activitySvc.log({ action: 'USER_BLOCKED', targetType: 'user', targetId: user._id.toString(), targetName: `${user.nom} ${user.prenom}`, performedBy: req.adminUser, req });
        res.json({ message: 'Compte bloqué', user });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.unblockUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { lockUntil: null, loginAttempts: 0 }, { new: true });
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
        await activitySvc.log({ action: 'USER_UNBLOCKED', targetType: 'user', targetId: user._id.toString(), targetName: `${user.nom} ${user.prenom}`, performedBy: req.adminUser, req });
        res.json({ message: 'Compte débloqué', user });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.resetUserPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Mot de passe invalide (min. 8 caractères)' });
        const hashed = await bcrypt.hash(newPassword, 12);
        const user = await User.findByIdAndUpdate(req.params.id, { password: hashed, refreshToken: null }, { new: true });


        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
        await activitySvc.log({ action: 'PASSWORD_RESET_SENT', targetType: 'user', targetId: user._id.toString(), targetName: `${user.nom} ${user.prenom}`, performedBy: req.adminUser, req });
        res.json({ message: 'Mot de passe réinitialisé' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
exports.create= async (req,res) =>{
    try{
        
    }
    catch{

    }
}
exports.changeUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        if (!['student','admin'].includes(role)) return res.status(400).json({ error: 'Rôle invalide' });
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
        await activitySvc.log({ action: 'ROLE_CHANGED', targetType: 'user', targetId: user._id.toString(), targetName: `${user.nom} ${user.prenom}`, performedBy: req.adminUser, metadata: { newRole: role }, req });
        res.json({ message: `Rôle changé en ${role}`, user });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ─────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────
exports.getReports = async (req, res) => {
    try {
        const period = Number(req.query.period) || 30;
        const since  = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

        const [userGrowth, docGrowth, topSubjects, topAuthors, usersByRole, docsByType, docsByLevel] = await Promise.all([
            User.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
            Document.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
            Document.aggregate([{ $group: { _id: '$subject', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
            Document.aggregate([{ $match: { author: { $nin: [null, ''] } } }, { $group: { _id: '$author', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
            User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
            Document.aggregate([{ $group: { _id: '$type',  count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
            Document.aggregate([{ $group: { _id: '$level', count: { $sum: 1 } } }, { $sort: { _id:   1  } }]),
        ]);

        res.json({ userGrowth, docGrowth, topSubjects, topAuthors, usersByRole, docsByType, docsByLevel });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ─────────────────────────────────────────────────────────────
// ACTIVITIES
// ─────────────────────────────────────────────────────────────
exports.getActivities = async (req, res) => {
    try {
        const result = await activitySvc.findAll(req.query);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getActivityStats = async (req, res) => {
    try {
        const stats = await activitySvc.getStats();
        res.json(stats);
    } catch (err) { res.status(500).json({ error: err.message }); }
};
