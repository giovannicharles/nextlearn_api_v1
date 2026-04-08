// src/modules/auth/auth.service.js
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const speakeasy = require('speakeasy');
const crypto   = require('crypto');
const User     = require('../user/user.model');
const { userRole } = require('../user/user.enum');
const emailService = require('../../services/email.service');

// ── Domaines autorisés ────────────────────────────────────────
const ALLOWED_DOMAINS = ['saintjeaningenieur.org', 'saintjeanmanagement.org'];

function isEmailAllowed(email) {
    const domain = email.toLowerCase().split('@')[1];
    return ALLOWED_DOMAINS.includes(domain);
}

// ── Admins : domaine interne exempté de la restriction ───────
function isAdminEmail(email) {
    return email.toLowerCase().endsWith('@nextlearn.org');
}

class AuthService {

    // ─────────────────────────────────────────────────────────
    // REGISTER
    // ─────────────────────────────────────────────────────────
    async register(data) {
        const { nom, prenom, email, password, classe, filiere } = data;

        if (!nom || !prenom || !email || !password) {
            throw new Error('Nom, Prénom, email et mot de passe sont requis');
        }

        // Vérification domaine (les admins @nextlearn.org sont exemptés)
        if (!isEmailAllowed(email) && !isAdminEmail(email)) {
            throw new Error('Seules les adresses @saintjeaningenieur.org et @saintjeanmanagement.org sont acceptées');
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            throw new Error('Un utilisateur avec cet email existe déjà');
        }

        if (password.length < 8) {
            throw new Error('Le mot de passe doit contenir au moins 8 caractères');
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const emailVerificationToken  = crypto.randomBytes(32).toString('hex');
        const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        const user = await User.create({
            nom:      nom.trim(),
            prenom:   prenom.trim(),
            email:    email.toLowerCase().trim(),
            password: hashedPassword,
            role:     userRole.student,
            classe:   classe || '',
            filiere:  filiere || '',
            isEmailVerified: false,
            twoFactorEnabled: false,
            emailVerificationToken,
            emailVerificationExpires,
        });

        // Email de vérification (non bloquant)
        emailService.sendVerificationEmail(user.email, emailVerificationToken, `${user.nom} ${user.prenom}`)
            .catch(e => console.error('⚠️ Email vérification non envoyé:', e.message));

        const { token, refreshToken } = this._generateTokenPair(user._id, user.role);

        return {
            success: true,
            user: this._formatUser(user),
            token,
            refreshToken,
            message: 'Compte créé avec succès. Vérifiez votre email pour activer votre compte.'
        };
    }

    // ─────────────────────────────────────────────────────────
    // LOGIN
    // ─────────────────────────────────────────────────────────
    async login(email, password) {
        if (!email || !password) throw new Error('Email et mot de passe sont requis');

        // Vérification domaine (admins @nextlearn.org exemptés)
        if (!isEmailAllowed(email) && !isAdminEmail(email)) {
            throw new Error('Accès réservé aux étudiants et enseignants Saint-Jean');
        }

        const user = await User.findOne({ email: email.toLowerCase() })
            .select('+password +twoFactorSecret +refreshToken');

        if (!user || !user.password) {
            throw new Error('Email ou mot de passe incorrect');
        }

        // Vérifier si le compte est verrouillé
        if (user.isLocked && user.isLocked()) {
            throw new Error('Compte temporairement verrouillé. Réessayez dans quelques minutes.');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            // Incrémenter les tentatives (non bloquant)
            await User.findByIdAndUpdate(user._id, { $inc: { loginAttempts: 1 } });
            throw new Error('Email ou mot de passe incorrect');
        }

        // Reset des tentatives au succès + mise à jour lastLoginAt
        await User.findByIdAndUpdate(user._id, {
            loginAttempts: 0,
            lockUntil: null,
            lastLoginAt: new Date()
        });

        // Si la 2FA est activée → token temporaire seulement
        if (user.twoFactorEnabled) {
            const tempToken = this._generateTempToken(user._id);
            return {
                success: true,
                requiresTwoFactor: true,
                tempToken,
                message: 'Code 2FA requis'
            };
        }

        const { token, refreshToken } = this._generateTokenPair(user._id, user.role);

        // Stocker le refresh token hashé
        await User.findByIdAndUpdate(user._id, {
            refreshToken: crypto.createHash('sha256').update(refreshToken).digest('hex')
        });

        return {
            success: true,
            requiresTwoFactor: false,
            user: this._formatUser(user),
            token,
            refreshToken,
            message: 'Connexion réussie'
        };
    }

    // ─────────────────────────────────────────────────────────
    // REFRESH TOKEN
    // ─────────────────────────────────────────────────────────
    async refreshAccessToken(refreshToken) {
        if (!refreshToken) throw new Error('Refresh token requis');

        const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

        const user = await User.findOne({ refreshToken: hashedToken }).select('+refreshToken');

        if (!user) throw new Error('Refresh token invalide ou expiré');

        const { token, refreshToken: newRefreshToken } = this._generateTokenPair(user._id, user.role);

        // Rotation du refresh token
        await User.findByIdAndUpdate(user._id, {
            refreshToken: crypto.createHash('sha256').update(newRefreshToken).digest('hex')
        });

        return {
            success: true,
            token,
            refreshToken: newRefreshToken,
            user: this._formatUser(user)
        };
    }

    // ─────────────────────────────────────────────────────────
    // VÉRIFICATION 2FA LORS DU LOGIN
    // ─────────────────────────────────────────────────────────
    async verifyLoginTwoFactor(tempToken, code) {
        let decoded;
        try {
            decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        } catch {
            throw new Error('Session expirée, veuillez vous reconnecter');
        }

        if (decoded.type !== 'temp') throw new Error('Token invalide');

        const user = await User.findById(decoded.id).select('+twoFactorSecret');
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            throw new Error('Utilisateur introuvable');
        }

        const isValid = speakeasy.totp.verify({
            secret:   user.twoFactorSecret,
            encoding: 'base32',
            token:    code,
            window:   1
        });

        if (!isValid) throw new Error('Code 2FA invalide');

        const { token, refreshToken } = this._generateTokenPair(user._id, user.role);

        await User.findByIdAndUpdate(user._id, {
            refreshToken: crypto.createHash('sha256').update(refreshToken).digest('hex'),
            lastLoginAt: new Date()
        });

        return {
            success: true,
            user: this._formatUser(user),
            token,
            refreshToken,
            message: 'Connexion réussie'
        };
    }

    // ─────────────────────────────────────────────────────────
    // SETUP 2FA
    // ─────────────────────────────────────────────────────────
    async setupTwoFactor(userId) {
        const user = await User.findById(userId);
        if (!user) throw new Error('Utilisateur introuvable');

        const secret = speakeasy.generateSecret({
            name:   `NextLearn (${user.email})`,
            issuer: 'NextLearn Saint-Jean',
            length: 20
        });

        await User.findByIdAndUpdate(userId, { twoFactorSecret: secret.base32 });

        return {
            success:    true,
            secret:     secret.base32,
            otpauthUrl: secret.otpauth_url
        };
    }

    // ─────────────────────────────────────────────────────────
    // ACTIVER 2FA
    // ─────────────────────────────────────────────────────────
    async enableTwoFactor(userId, code) {
        const user = await User.findById(userId).select('+twoFactorSecret');
        if (!user || !user.twoFactorSecret) throw new Error('Configurez d\'abord la 2FA');

        const isValid = speakeasy.totp.verify({
            secret: user.twoFactorSecret, encoding: 'base32', token: code, window: 1
        });

        if (!isValid) throw new Error('Code invalide. Vérifiez votre application et réessayez');

        await User.findByIdAndUpdate(userId, { twoFactorEnabled: true });

        return { success: true, message: 'Authentification à deux facteurs activée' };
    }

    // ─────────────────────────────────────────────────────────
    // DÉSACTIVER 2FA
    // ─────────────────────────────────────────────────────────
    async disableTwoFactor(userId, code) {
        const user = await User.findById(userId).select('+twoFactorSecret');
        if (!user || !user.twoFactorEnabled) throw new Error('La 2FA n\'est pas activée');

        const isValid = speakeasy.totp.verify({
            secret: user.twoFactorSecret, encoding: 'base32', token: code, window: 1
        });

        if (!isValid) throw new Error('Code invalide');

        await User.findByIdAndUpdate(userId, { twoFactorEnabled: false, twoFactorSecret: null });

        return { success: true, message: 'Authentification à deux facteurs désactivée' };
    }

    // ─────────────────────────────────────────────────────────
    // MISE À JOUR PROFIL
    // ─────────────────────────────────────────────────────────
    async updateProfile(userId, data) {
        const allowed = ['nom', 'prenom', 'classe', 'filiere', 'bio', 'photoUrl'];
        const update  = {};
        allowed.forEach(field => { if (data[field] !== undefined) update[field] = data[field]; });

        const user = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true });
        if (!user) throw new Error('Utilisateur introuvable');

        return { success: true, user: this._formatUser(user), message: 'Profil mis à jour' };
    }

    // ─────────────────────────────────────────────────────────
    // CHANGEMENT DE MOT DE PASSE
    // ─────────────────────────────────────────────────────────
    async changePassword(userId, currentPassword, newPassword) {
        if (!currentPassword || !newPassword) throw new Error('Les deux mots de passe sont requis');
        if (newPassword.length < 8) throw new Error('Le nouveau mot de passe doit contenir au moins 8 caractères');

        const user = await User.findById(userId).select('+password');
        if (!user) throw new Error('Utilisateur introuvable');

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) throw new Error('Mot de passe actuel incorrect');

        await User.findByIdAndUpdate(userId, {
            password: await bcrypt.hash(newPassword, 12),
            refreshToken: null // Invalider tous les refresh tokens
        });

        return { success: true, message: 'Mot de passe changé avec succès' };
    }

    // ─────────────────────────────────────────────────────────
    // FORGOT PASSWORD
    // ─────────────────────────────────────────────────────────
    async forgotPassword(email) {
        if (!email) throw new Error('Email requis');

        if (!isEmailAllowed(email) && !isAdminEmail(email)) {
            throw new Error('Seules les adresses institutionnelles Saint-Jean sont acceptées');
        }

        // Réponse identique qu'un user existe ou non (sécurité)
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return { success: true, message: 'Si cet email existe, un lien a été envoyé.' };
        }

        const resetToken   = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h

        await User.findByIdAndUpdate(user._id, {
            resetPasswordToken:   crypto.createHash('sha256').update(resetToken).digest('hex'),
            resetPasswordExpires: resetExpires
        });

        try {
            await emailService.sendPasswordResetEmail(user.email, resetToken, `${user.nom} ${user.prenom}`);
        } catch (e) {
            await User.findByIdAndUpdate(user._id, {
                resetPasswordToken: null, resetPasswordExpires: null
            });
            throw new Error('Erreur lors de l\'envoi de l\'email. Réessayez plus tard.');
        }

        return { success: true, message: 'Si cet email existe, un lien a été envoyé.' };
    }

    // ─────────────────────────────────────────────────────────
    // RESET PASSWORD
    // ─────────────────────────────────────────────────────────
    async resetPassword(token, newPassword) {
        if (!token || !newPassword) throw new Error('Token et nouveau mot de passe requis');
        if (newPassword.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractères');

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken:   hashedToken,
            resetPasswordExpires: { $gt: new Date() }
        }).select('+resetPasswordToken +resetPasswordExpires');

        if (!user) throw new Error('Lien invalide ou expiré. Demandez un nouveau lien.');

        await User.findByIdAndUpdate(user._id, {
            password:             await bcrypt.hash(newPassword, 12),
            resetPasswordToken:   null,
            resetPasswordExpires: null,
            refreshToken:         null // Invalider les sessions existantes
        });

        return { success: true, message: 'Mot de passe réinitialisé avec succès' };
    }

    // ─────────────────────────────────────────────────────────
    // VERIFY EMAIL
    // ─────────────────────────────────────────────────────────
    async verifyEmail(token) {
        const user = await User.findOne({
            emailVerificationToken:   token,
            emailVerificationExpires: { $gt: new Date() }
        }).select('+emailVerificationToken +emailVerificationExpires');

        if (!user) throw new Error('Lien de vérification invalide ou expiré');

        await User.findByIdAndUpdate(user._id, {
            isEmailVerified:          true,
            emailVerificationToken:   null,
            emailVerificationExpires: null
        });

        return { success: true, message: 'Email vérifié avec succès' };
    }

    // ─────────────────────────────────────────────────────────
    // HELPERS PRIVÉS
    // ─────────────────────────────────────────────────────────
    _generateTokenPair(userId, role) {
        if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET non défini');

        const token = jwt.sign(
            { id: userId, role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        const refreshToken = jwt.sign(
            { id: userId, role, type: 'refresh' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        return { token, refreshToken };
    }

    _generateTempToken(userId) {
        if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET non défini');
        return jwt.sign({ id: userId, type: 'temp' }, process.env.JWT_SECRET, { expiresIn: '5m' });
    }

    _formatUser(user) {
        return {
            id:               user._id,
            name:             `${user.nom} ${user.prenom}`,
            email:            user.email,
            role:             user.role,
            classe:           user.classe,
            filiere:          user.filiere,
            bio:              user.bio || '',
            photoUrl:         user.photoUrl || null,
            twoFactorEnabled: user.twoFactorEnabled || false,
            isEmailVerified:  user.isEmailVerified || false,
        };
    }
}

module.exports = new AuthService();