// src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token d\'authentification manquant' });
        }

        const token   = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Refuser explicitement les tokens temporaires (OTP non complété)
        if (decoded.type === 'temp') {
            return res.status(401).json({
                error: 'Authentification incomplète. Veuillez compléter la vérification 2FA.',
                code: 'OTP_REQUIRED'
            });
        }

        // Refuser les refresh tokens sur les routes API normales
        if (decoded.type === 'refresh') {
            return res.status(401).json({
                error: 'Token invalide pour cette ressource',
                code: 'INVALID_TOKEN_TYPE'
            });
        }

        req.user = { id: decoded.id, role: decoded.role };
        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Session expirée. Veuillez vous reconnecter.',
                code: 'TOKEN_EXPIRED'
            });
        }
        return res.status(401).json({
            error: 'Token invalide',
            code: 'INVALID_TOKEN'
        });
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
        return res.status(403).json({ error: 'Accès non autorisé' });
    }
    next();
};