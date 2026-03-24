const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    console.log('🔐 verifyToken - Headers:', req.headers);
    
    const authHeader = req.headers['authorization'];
    console.log('🔐 Auth Header:', authHeader ? authHeader.substring(0, 30) + '...' : 'AUCUN');
    
    const token = authHeader?.split(' ')[1];

    if (!token) {
        console.log('❌ verifyToken - Token manquant');
        return res.status(403).json({ error: 'Token requis' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log('✅ verifyToken - Token valide pour user:', decoded.id);
        next();
    } catch (error) {
        console.error('❌ verifyToken - Token invalide:', error.message);
        return res.status(401).json({ error: 'Token invalide' });
    }
};

const isAdmin = (req, res, next) => {
    console.log('🔐 isAdmin - User:', req.user);
    
    if (req.user && req.user.role === 'admin') {
        console.log('✅ isAdmin - Accès admin autorisé');
        next();
    } else {
        console.log('❌ isAdmin - Accès refusé (pas admin)');
        res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
};

module.exports = { verifyToken, isAdmin };