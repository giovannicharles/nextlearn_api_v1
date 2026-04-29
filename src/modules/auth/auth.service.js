// src/modules/auth/auth.service.js
const jwt          = require('jsonwebtoken');
const bcrypt       = require('bcryptjs');
const crypto       = require('crypto');
const User         = require('../user/user.model');
const { userRole } = require('../user/user.enum');
const emailService = require('../../services/email.service');
const activitySvc  = require('../activity/activity.service');

const ALLOWED_DOMAINS  = ['saintjeaningenieur.org', 'saintjeanmanagement.org'];
const INTERNAL_DOMAINS = ['nextlearn.org'];

function isDomainAccepted(email) {
    if (!email) return false;
    const domain = email.toLowerCase().split('@')[1];
    return ALLOWED_DOMAINS.includes(domain) || INTERNAL_DOMAINS.includes(domain);
}

function generateOtp() {
    const buf = crypto.randomBytes(3);
    const num = (buf.readUIntBE(0, 3) % 900000) + 100000;
    return num.toString();
}

function maskEmail(email) {
    const [local, domain] = email.split('@');
    if (local.length <= 3) return `${local[0]}***@${domain}`;
    return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

class AuthService {

    async register(data, req) {
        const { nom, prenom, email, password, classe, filiere } = data;

        if (!nom || !prenom || !email || !password)
            throw new Error('Nom, Prénom, email et mot de passe sont requis');

        if (!isDomainAccepted(email))
            throw new Error('Seules les adresses @saintjeaningenieur.org et @saintjeanmanagement.org sont acceptées');

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) throw new Error('Un compte avec cet email existe déjà');

        if (password.length < 8)
            throw new Error('Le mot de passe doit contenir au moins 8 caractères');

        const hashedPassword           = await bcrypt.hash(password, 12);
        const otpCode                  = generateOtp();
        const otpExpires               = new Date(Date.now() + 10 * 60 * 1000);
        const emailVerificationToken   = crypto.randomBytes(32).toString('hex');
        const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const user = await User.create({
            nom:      nom.trim(),
            prenom:   prenom.trim(),
            email:    email.toLowerCase().trim(),
            password: hashedPassword,
            role:     userRole.student,
            classe:   classe || '',
            filiere:  filiere || '',
            isEmailVerified:  false,
            twoFactorEnabled: true,
            otpCode,
            otpExpires,
            otpAttempts: 0,
            emailVerificationToken,
            emailVerificationExpires,
        });

        await activitySvc.log({
            action:      'USER_REGISTERED',
            targetType:  'User',
            targetId:    user._id,
            targetName:  `${user.nom} ${user.prenom}`,
            performedBy: user,
            metadata:    { email: user.email, classe: user.classe, filiere: user.filiere },
            req,
        });

        try {
            await emailService.sendOtpEmail(user.email, otpCode, `${user.nom} ${user.prenom}`);
        } catch (emailError) {
            console.error('❌ OTP non envoyé:', emailError.message);
            if (process.env.SMTP_USER && process.env.SMTP_PASS) {
                await User.findByIdAndDelete(user._id);
                throw new Error('Impossible d\'envoyer le code de vérification. Réessayez.');
            }
            console.warn(`   ⚠️  Code OTP pour ${user.email}: ${otpCode}`);
        }

        emailService.sendVerificationEmail(user.email, emailVerificationToken, `${user.nom} ${user.prenom}`)
            .catch(e => console.error('⚠️ Email vérif:', e.message));

        const { token: tempToken } = this._generateTemp(user._id);

        return {
            success:           true,
            requiresTwoFactor: true,
            tempToken,
            maskedEmail:       maskEmail(user.email),
            message:           `Un code de vérification a été envoyé à ${maskEmail(user.email)}`,
        };
    }

    async login(email, password, req) {
        if (!email || !password) throw new Error('Email et mot de passe sont requis');

        if (!isDomainAccepted(email))
            throw new Error('Accès réservé aux membres de l\'établissement Saint-Jean');

        const user = await User.findOne({ email: email.toLowerCase() })
            .select('+password +loginAttempts +lockUntil');

        if (!user || !user.password) {
            await bcrypt.hash('_timing_dummy_', 10);
            throw new Error('Email ou mot de passe incorrect');
        }

        if (user.isLocked()) {
            const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
            throw new Error(`Compte verrouillé. Réessayez dans ${mins} minute(s).`);
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            const attempts = (user.loginAttempts || 0) + 1;
            const update   = { loginAttempts: attempts };
            if (attempts >= 5) {
                update.lockUntil     = new Date(Date.now() + 30 * 60 * 1000);
                update.loginAttempts = 0;
            }
            await User.findByIdAndUpdate(user._id, update);
            throw new Error('Email ou mot de passe incorrect');
        }

        await User.findByIdAndUpdate(user._id, { loginAttempts: 0, lockUntil: null });

        const otpCode    = generateOtp();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await User.findByIdAndUpdate(user._id, { otpCode, otpExpires, otpAttempts: 0 });

        try {
            await emailService.sendOtpEmail(user.email, otpCode, `${user.nom} ${user.prenom}`);
        } catch (e) {
            console.error('❌ Erreur envoi OTP:', e.message);
            if (process.env.SMTP_USER && process.env.SMTP_PASS) {
                await User.findByIdAndUpdate(user._id, { otpCode: null, otpExpires: null });
                throw new Error('Erreur lors de l\'envoi du code. Réessayez.');
            }
            console.warn(`   ⚠️  Code OTP pour ${user.email}: ${otpCode}`);
        }

        const { token: tempToken } = this._generateTemp(user._id);

        await activitySvc.log({
            action:      'LOGIN_OTP_SENT',
            targetType:  'User',
            targetId:    user._id,
            targetName:  `${user.nom} ${user.prenom}`,
            performedBy: user,
            metadata:    { maskedEmail: maskEmail(user.email) },
            req,
        });

        return {
            success:           true,
            requiresTwoFactor: true,
            tempToken,
            maskedEmail:       maskEmail(user.email),
            message:           `Code envoyé à ${maskEmail(user.email)}`,
        };
    }

    async verifyLoginOtp(tempToken, code, req) {
        if (!tempToken || !code) throw new Error('Token et code requis');

        let decoded;
        try {
            decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        } catch (e) {
            if (e.name === 'TokenExpiredError') throw new Error('Session expirée. Reconnectez-vous.');
            throw new Error('Token invalide. Reconnectez-vous.');
        }

        if (decoded.type !== 'temp') throw new Error('Token invalide');

        const user = await User.findById(decoded.id)
            .select('+otpCode +otpExpires +otpAttempts');

        if (!user) throw new Error('Utilisateur introuvable');
        if (!user.otpCode || !user.otpExpires) throw new Error('Aucun code en attente. Reconnectez-vous.');
        if (user.otpExpires < new Date()) {
            await User.findByIdAndUpdate(user._id, { otpCode: null, otpExpires: null, otpAttempts: 0 });
            throw new Error('Code expiré. Reconnectez-vous pour en recevoir un nouveau.');
        }

        const attempts = (user.otpAttempts || 0) + 1;
        if (attempts > 5) {
            await User.findByIdAndUpdate(user._id, { otpCode: null, otpExpires: null, otpAttempts: 0 });
            throw new Error('Trop de tentatives incorrectes. Reconnectez-vous.');
        }

        const isMatch = crypto.timingSafeEqual(
            Buffer.from(code.trim().slice(0, 6).padEnd(6, ' ')),
            Buffer.from(user.otpCode.padEnd(6, ' '))
        );

        if (!isMatch) {
            await User.findByIdAndUpdate(user._id, { otpAttempts: attempts });
            const left = 5 - attempts;
            if (left <= 0) throw new Error('Code incorrect. Veuillez vous reconnecter.');
            throw new Error(`Code incorrect. ${left} tentative(s) restante(s).`);
        }

        const { token, refreshToken } = this._generateTokenPair(user._id, user.role);

        await User.findByIdAndUpdate(user._id, {
            otpCode:      null,
            otpExpires:   null,
            otpAttempts:  0,
            lastLoginAt:  new Date(),
            refreshToken: crypto.createHash('sha256').update(refreshToken).digest('hex'),
        });

        await activitySvc.log({
            action:      'LOGIN_SUCCESS',
            targetType:  'User',
            targetId:    user._id,
            targetName:  `${user.nom} ${user.prenom}`,
            performedBy: user,
            metadata:    {},
            req,
        });

        return {
            success:      true,
            user:         this._formatUser(user),
            token,
            refreshToken,
            message:      'Connexion réussie',
        };
    }

    async resendOtp(tempToken) {
        if (!tempToken) throw new Error('Token requis');

        let decoded;
        try {
            decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        } catch {
            throw new Error('Session expirée. Reconnectez-vous.');
        }

        if (decoded.type !== 'temp') throw new Error('Token invalide');

        const user = await User.findById(decoded.id).select('+otpExpires');
        if (!user) throw new Error('Utilisateur introuvable');

        if (user.otpExpires && user.otpExpires > new Date(Date.now() + 9.5 * 60 * 1000)) {
            const waitSec = Math.ceil((user.otpExpires.getTime() - (Date.now() + 9.5 * 60 * 1000)) / 1000 + 60);
            throw new Error(`Attendez encore ${waitSec} seconde(s) avant de renvoyer un code.`);
        }

        const otpCode    = generateOtp();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await User.findByIdAndUpdate(user._id, { otpCode, otpExpires, otpAttempts: 0 });

        try {
            await emailService.sendOtpEmail(user.email, otpCode, `${user.nom} ${user.prenom}`);
        } catch (e) {
            if (process.env.SMTP_USER && process.env.SMTP_PASS) throw e;
            console.warn(`   ⚠️  Code OTP pour ${user.email}: ${otpCode}`);
        }

        const { token: newTempToken } = this._generateTemp(user._id);
        return { success: true, tempToken: newTempToken, message: 'Nouveau code envoyé' };
    }

    async refreshAccessToken(refreshToken) {
        if (!refreshToken) throw new Error('Refresh token requis');
        const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const user   = await User.findOne({ refreshToken: hashed }).select('+refreshToken');
        if (!user) throw new Error('Session expirée. Reconnectez-vous.');
        const { token, refreshToken: newRT } = this._generateTokenPair(user._id, user.role);
        await User.findByIdAndUpdate(user._id, {
            refreshToken: crypto.createHash('sha256').update(newRT).digest('hex')
        });
        return { success: true, token, refreshToken: newRT, user: this._formatUser(user) };
    }

    async updateProfile(userId, data, req) {
        const allowed = ['nom', 'prenom', 'classe', 'filiere', 'bio', 'photoUrl'];
        const update  = {};
        allowed.forEach(f => { if (data[f] !== undefined) update[f] = data[f]; });
        const user = await User.findByIdAndUpdate(userId, update, { returnDocument: 'after', runValidators: true });
        if (!user) throw new Error('Utilisateur introuvable');

        await activitySvc.log({
            action:      'PROFILE_UPDATED',
            targetType:  'User',
            targetId:    user._id,
            targetName:  `${user.nom} ${user.prenom}`,
            performedBy: user,
            metadata:    { fields: Object.keys(update) },
            req,
        });

        return { success: true, user: this._formatUser(user), message: 'Profil mis à jour' };
    }

    async changePassword(userId, currentPassword, newPassword, req) {
        if (!currentPassword || !newPassword) throw new Error('Les deux mots de passe sont requis');
        if (newPassword.length < 8) throw new Error('Minimum 8 caractères');
        const user = await User.findById(userId).select('+password');
        if (!user) throw new Error('Utilisateur introuvable');
        if (!await bcrypt.compare(currentPassword, user.password)) throw new Error('Mot de passe actuel incorrect');
        await User.findByIdAndUpdate(userId, { password: await bcrypt.hash(newPassword, 12), refreshToken: null });

        await activitySvc.log({
            action:      'PASSWORD_CHANGED',
            targetType:  'User',
            targetId:    user._id,
            targetName:  `${user.nom} ${user.prenom}`,
            performedBy: user,
            metadata:    {},
            req,
        });

        return { success: true, message: 'Mot de passe modifié avec succès' };
    }

    async forgotPassword(email, req) {
        if (!email) throw new Error('Email requis');
        if (!isDomainAccepted(email)) throw new Error('Adresse email institutionnelle requise');

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            await new Promise(r => setTimeout(r, 600));
            return { success: true, message: 'Si cet email est enregistré, un lien a été envoyé.' };
        }

        const resetToken   = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

        await User.findByIdAndUpdate(user._id, {
            resetPasswordToken:   crypto.createHash('sha256').update(resetToken).digest('hex'),
            resetPasswordExpires: resetExpires,
        });

        await activitySvc.log({
            action:      'PASSWORD_RESET_REQUESTED',
            targetType:  'User',
            targetId:    user._id,
            targetName:  `${user.nom} ${user.prenom}`,
            performedBy: user,
            metadata:    { email: user.email },
            req,
        });

        try {
            await emailService.sendPasswordResetEmail(user.email, resetToken, `${user.nom} ${user.prenom}`);
        } catch (e) {
            console.error('❌ Erreur envoi reset email:', e.message);
            if (process.env.SMTP_USER && process.env.SMTP_PASS) {
                await User.findByIdAndUpdate(user._id, { resetPasswordToken: null, resetPasswordExpires: null });
                throw new Error('Erreur lors de l\'envoi. Réessayez dans quelques minutes.');
            }
            console.warn(`   ⚠️  Token reset pour ${user.email}: ${resetToken}`);
        }

        return { success: true, message: 'Si cet email est enregistré, un lien a été envoyé.' };
    }

    async resetPassword(token, newPassword, req) {
        if (!token || !newPassword) throw new Error('Token et nouveau mot de passe requis');
        if (newPassword.length < 8) throw new Error('Minimum 8 caractères');

        const hashed = crypto.createHash('sha256').update(token).digest('hex');
        const user   = await User.findOne({
            resetPasswordToken:   hashed,
            resetPasswordExpires: { $gt: new Date() },
        }).select('+resetPasswordToken +resetPasswordExpires');

        if (!user) throw new Error('Lien invalide ou expiré. Refaites une demande.');

        await User.findByIdAndUpdate(user._id, {
            password:             await bcrypt.hash(newPassword, 12),
            resetPasswordToken:   null,
            resetPasswordExpires: null,
            refreshToken:         null,
        });

        await activitySvc.log({
            action:      'PASSWORD_RESET',
            targetType:  'User',
            targetId:    user._id,
            targetName:  `${user.nom} ${user.prenom}`,
            performedBy: user,
            metadata:    {},
            req,
        });

        return { success: true, message: 'Mot de passe réinitialisé. Connectez-vous.' };
    }

    async verifyEmail(token) {
        const user = await User.findOne({
            emailVerificationToken:   token,
            emailVerificationExpires: { $gt: new Date() },
        }).select('+emailVerificationToken +emailVerificationExpires');

        if (!user) throw new Error('Lien de vérification invalide ou expiré');

        await User.findByIdAndUpdate(user._id, {
            isEmailVerified:          true,
            emailVerificationToken:   null,
            emailVerificationExpires: null,
        });

        return { success: true, message: 'Email vérifié avec succès' };
    }

    _generateTokenPair(userId, role) {
        if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET non défini dans .env');
        const token = jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        const refreshToken = jwt.sign({ id: userId, role, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '30d' });
        return { token, refreshToken };
    }

    _generateTemp(userId) {
        if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET non défini dans .env');
        return { token: jwt.sign({ id: userId, type: 'temp' }, process.env.JWT_SECRET, { expiresIn: '15m' }) };
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
            twoFactorEnabled: true,
            isEmailVerified:  user.isEmailVerified || false,
        };
    }
}

module.exports = new AuthService();