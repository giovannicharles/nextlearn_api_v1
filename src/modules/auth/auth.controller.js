// auth.controller.js
const authservice = require('./auth.service');

/**
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
    try {
        console.log('📥 Requête reçue sur /register');
        console.log('📝 Body:', req.body);
        const result = await authservice.register(req.body);
        console.log('✅ Inscription réussie:', result);
        res.status(201).json(result);
    }
    catch (error) {
        console.error('❌ Erreur register:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
    try {
        console.log('📥 Requête reçue sur /login');
        console.log('📝 Body:', req.body);
        
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email et mot de passe requis'
            });
        }
        
        const result = await authservice.login(email, password);
        console.log('✅ Connexion réussie pour:', email);
        res.json(result);
    } catch (error) {
        console.error('❌ Erreur login:', error);
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
};