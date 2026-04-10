// src/modules/auth/auth.controller.js
const authService = require('./auth.service');

exports.register = async (req, res) => {
    try {
        const result = await authService.register(req.body);
        res.status(201).json(result);
    } catch (err) {
        console.error('❌ register:', err.message);
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
        const result = await authService.login(email, password);
        res.json(result);
    } catch (err) {
        console.error('❌ login:', err.message);
        res.status(401).json({ success: false, message: err.message });
    }
};

exports.verifyLoginTwoFactor = async (req, res) => {
    try {
        const { tempToken, code } = req.body;
        if (!tempToken || !code)
            return res.status(400).json({ success: false, message: 'Token et code requis' });
        const result = await authService.verifyLoginOtp(tempToken, code);
        res.json(result);
    } catch (err) {
        console.error('❌ verifyOtp:', err.message);
        res.status(401).json({ success: false, message: err.message });
    }
};

exports.resendOtp = async (req, res) => {
    try {
        const { tempToken } = req.body;
        if (!tempToken)
            return res.status(400).json({ success: false, message: 'Token requis' });
        const result = await authService.resendOtp(tempToken);
        res.json(result);
    } catch (err) {
        console.error('❌ resendOtp:', err.message);
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const result = await authService.refreshAccessToken(refreshToken);
        res.json(result);
    } catch (err) {
        console.error('❌ refreshToken:', err.message);
        res.status(401).json({ success: false, message: err.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const User = require('../user/user.model');
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        res.json({ success: true, user: authService._formatUser(user) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const result = await authService.updateProfile(req.user.id, req.body);
        res.json(result);
    } catch (err) {
        console.error('❌ updateProfile:', err.message);
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email requis' });
        const result = await authService.forgotPassword(email);
        res.json(result);
    } catch (err) {
        console.error('❌ forgotPassword:', err.message);
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword)
            return res.status(400).json({ success: false, message: 'Token et nouveau mot de passe requis' });
        const result = await authService.resetPassword(token, newPassword);
        res.json(result);
    } catch (err) {
        console.error('❌ resetPassword:', err.message);
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const result = await authService.verifyEmail(req.params.token);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.validateToken = (req, res) => {
    res.json({ success: true, user: req.user });
};