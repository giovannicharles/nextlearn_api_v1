// src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../modules/user/user.model');

exports.verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Refuser les tokens temporaires (2FA non complétée)
        if (decoded.type === 'temp') {
            return res.status(401).json({ error: 'Authentification 2FA incomplète' });
        }

        req.user = { id: decoded.id, role: decoded.role };
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expiré' });
        }
        return res.status(401).json({ error: 'Token invalide' });
    }
};

exports.isAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Accès administrateur requis' });
    }
    next();
};

exports.isAdminOrTeacher = (req, res, next) => {
    if (!['admin', 'professeur'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
};