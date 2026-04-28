// src/middleware/auth.middleware.js
const jwt  = require('jsonwebtoken');
const User = require('../modules/user/user.model');

exports.verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant', code: 'NO_TOKEN' });
        }

        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);

        if (decoded.type === 'temp') {
            return res.status(401).json({ error: 'Vérification OTP incomplète', code: 'OTP_REQUIRED' });
        }
        if (decoded.type === 'refresh') {
            return res.status(401).json({ error: 'Token invalide pour cette ressource', code: 'WRONG_TOKEN_TYPE' });
        }

        // Enrichir req.user avec l'email pour les logs admin
        let userEmail = decoded.email || '';
        if (!userEmail) {
            try {
                const u = await User.findById(decoded.id).lean();
                if (u) userEmail = u.email;
            } catch { /* non bloquant */ }
        }

        req.user = { id: decoded.id, role: decoded.role, email: userEmail };
        next();

    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expirée', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ error: 'Token invalide', code: 'INVALID_TOKEN' });
    }
};

exports.isAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Accès administrateur requis' });
    }
    next();
};

exports.isAdminOrTeacher = (req, res, next) => {
    if (!['admin','professeur'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Accès non autorisé' });
    }
    next();
};
