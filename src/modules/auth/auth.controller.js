// src/modules/auth/auth.controller.js
const authService = require('./auth.service');

exports.register = async (req, res) => {
    try {
        const result = await authService.register(req.body);
        res.status(201).json(result);
    } catch (error) {
        console.error('❌ Erreur register:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
        }
        const result = await authService.login(email, password);
        res.json(result);
    } catch (error) {
        console.error('❌ Erreur login:', error.message);
        res.status(401).json({ success: false, message: error.message });
    }
};

exports.verifyLoginTwoFactor = async (req, res) => {
    try {
        const { tempToken, code } = req.body;
        if (!tempToken || !code) {
            return res.status(400).json({ success: false, message: 'Token et code requis' });
        }
        const result = await authService.verifyLoginOtp(tempToken, code);
        res.json(result);
    } catch (error) {
        console.error('❌ Erreur vérification OTP:', error.message);
        res.status(401).json({ success: false, message: error.message });
    }
};

exports.resendOtp = async (req, res) => {
    try {
        const { tempToken } = req.body;
        if (!tempToken) {
            return res.status(400).json({ success: false, message: 'Token requis' });
        }
        const result = await authService.resendOtp(tempToken);
        res.json(result);
    } catch (error) {
        console.error('❌ Erreur renvoi OTP:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const result = await authService.refreshAccessToken(refreshToken);
        res.json(result);
    } catch (error) {
        console.error('❌ Erreur refresh token:', error.message);
        res.status(401).json({ success: false, message: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const result = await authService.updateProfile(req.user.id, req.body);
        res.json(result);
    } catch (error) {
        console.error('❌ Erreur update profile:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
        res.json(result);
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email requis' });
        const result = await authService.forgotPassword(email);
        res.json(result);
    } catch (error) {
        console.error('❌ Erreur forgot password:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: 'Token et nouveau mot de passe requis' });
        }
        const result = await authService.resetPassword(token, newPassword);
        res.json(result);
    } catch (error) {
        console.error('❌ Erreur reset password:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const result = await authService.verifyEmail(token);
        res.json(result);
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.validateToken = async (req, res) => {
    res.json({ success: true, user: req.user });
};

exports.getProfile = async (req, res) => {
    try {
        const User = require('../user/user.model');
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        const authSvc = require('./auth.service');
        res.json({ success: true, user: authSvc._formatUser(user) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};