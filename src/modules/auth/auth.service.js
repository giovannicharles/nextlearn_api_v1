// src/modules/auth/auth.service.js
const jwt          = require('jsonwebtoken');
const bcrypt       = require('bcryptjs');
const crypto       = require('crypto');
const User         = require('../user/user.model');
const { userRole } = require('../user/user.enum');
const emailService = require('../../services/email.service');

// ── Domaines autorisés ────────────────────────────────────────
const ALLOWED_DOMAINS = ['saintjeaningenieur.org', 'saintjeanmanagement.org'];

function isEmailAllowed(email) {
    if (!email) return false;
    const domain = email.toLowerCase().split('@')[1];
    return ALLOWED_DOMAINS.includes(domain);
}

// Les admins @nextlearn.org sont exemptés de la restriction de domaine
function isAdminEmail(email) {
    if (!email) return false;
    return email.toLowerCase().endsWith('@nextlearn.org');
}

function isDomainAccepted(email) {
    return isEmailAllowed(email) || isAdminEmail(email);
}

// ── Génération d'un code OTP 6 chiffres ──────────────────────
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
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

        if (!isDomainAccepted(email)) {
            throw new Error('Seules les adresses @saintjeaningenieur.org et @saintjeanmanagement.org sont acceptées');
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            throw new Error('Un compte avec cet email existe déjà');
        }

        if (password.length < 8) {
            throw new Error('Le mot de passe doit contenir au moins 8 caractères');
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const emailVerificationToken   = crypto.randomBytes(32).toString('hex');
        const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        const user = await User.create({
            nom:    nom.trim(),
            prenom: prenom.trim(),
            email:  email.toLowerCase().trim(),
            password: hashedPassword,
            role:   userRole.student,
            classe: classe || '',
            filiere: filiere || '',
            isEmailVerified: false,
            twoFactorEnabled: true,
            emailVerificationToken,
            emailVerificationExpires,
        });

        // Email de bienvenue + vérification (non bloquant)
        emailService.sendVerificationEmail(
            user.email,
            emailVerificationToken,
            `${user.nom} ${user.prenom}`
        ).catch(e => console.error('⚠️ Email vérification non envoyé:', e.message));

        // Après inscription → on génère directement un OTP pour la première connexion
        const { token: tempToken } = this._generateTemp(user._id);

        return {
            success: true,
            requiresTwoFactor: true,
            tempToken,
            message: 'Compte créé ! Un code de vérification a été envoyé à votre email.'
        };
    }

    // ─────────────────────────────────────────────────────────
    // LOGIN — Étape 1 : vérification mot de passe → envoi OTP
    // ─────────────────────────────────────────────────────────
    async login(email, password) {
        if (!email || !password) {
            throw new Error('Email et mot de passe sont requis');
        }

        if (!isDomainAccepted(email)) {
            throw new Error('Accès réservé aux étudiants et enseignants Saint-Jean');
        }

        const user = await User.findOne({ email: email.toLowerCase() })
            .select('+password +refreshToken +loginAttempts +lockUntil');

        if (!user || !user.password) {
            // Délai pour éviter le timing attack
            await bcrypt.hash('fake_password_timing_protection', 12);
            throw new Error('Email ou mot de passe incorrect');
        }

        if (user.isLocked()) {
            const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
            throw new Error(`Compte verrouillé. Réessayez dans ${minutesLeft} minute(s).`);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            // Incrémenter les tentatives
            const attempts = (user.loginAttempts || 0) + 1;
            const update   = { loginAttempts: attempts };

            // Verrouiller après 5 tentatives (30 minutes)
            if (attempts >= 5) {
                update.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
                update.loginAttempts = 0;
            }

            await User.findByIdAndUpdate(user._id, update);
            throw new Error('Email ou mot de passe incorrect');
        }

        // Reset des tentatives
        await User.findByIdAndUpdate(user._id, {
            loginAttempts: 0,
            lockUntil: null,
        });

        // ── Générer et envoyer l'OTP ──────────────────────────
        const otpCode    = generateOtp();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        await User.findByIdAndUpdate(user._id, {
            otpCode,
            otpExpires,
            otpAttempts: 0,
        });

        try {
            await emailService.sendOtpEmail(
                user.email,
                otpCode,
                `${user.nom} ${user.prenom}`
            );
        } catch (emailError) {
            console.error('❌ Erreur envoi OTP:', emailError.message);
            // Nettoyer l'OTP si l'email échoue
            await User.findByIdAndUpdate(user._id, {
                otpCode: null, otpExpires: null
            });
            throw new Error('Erreur lors de l\'envoi du code de vérification. Réessayez.');
        }

        const { token: tempToken } = this._generateTemp(user._id);

        return {
            success: true,
            requiresTwoFactor: true,
            tempToken,
            message: `Un code de vérification a été envoyé à ${user.email.replace(/(.{2}).*(@)/, '$1***$2')}`
        };
    }

    // ─────────────────────────────────────────────────────────
    // VERIFY OTP — Étape 2 : vérification du code → connexion complète
    // ─────────────────────────────────────────────────────────
    async verifyLoginOtp(tempToken, code) {
        if (!tempToken || !code) {
            throw new Error('Token et code requis');
        }

        // Vérifier le token temporaire
        let decoded;
        try {
            decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        } catch (e) {
            if (e.name === 'TokenExpiredError') {
                throw new Error('Session expirée. Veuillez vous reconnecter.');
            }
            throw new Error('Token invalide. Veuillez vous reconnecter.');
        }

        if (decoded.type !== 'temp') {
            throw new Error('Token invalide');
        }

        const user = await User.findById(decoded.id)
            .select('+otpCode +otpExpires +otpAttempts +refreshToken');

        if (!user) {
            throw new Error('Utilisateur introuvable');
        }

        // Vérifier si l'OTP existe et n'est pas expiré
        if (!user.otpCode || !user.otpExpires) {
            throw new Error('Aucun code en attente. Veuillez vous reconnecter.');
        }

        if (user.otpExpires < new Date()) {
            await User.findByIdAndUpdate(user._id, {
                otpCode: null, otpExpires: null, otpAttempts: 0
            });
            throw new Error('Code expiré. Veuillez vous reconnecter pour recevoir un nouveau code.');
        }

        // Limiter les tentatives de code (max 5)
        const attempts = (user.otpAttempts || 0) + 1;
        if (attempts > 5) {
            await User.findByIdAndUpdate(user._id, {
                otpCode: null, otpExpires: null, otpAttempts: 0
            });
            throw new Error('Trop de tentatives. Veuillez vous reconnecter.');
        }

        // Comparer le code (comparaison en temps constant)
        const codeMatch = crypto.timingSafeEqual(
            Buffer.from(code.trim().padEnd(6, ' ')),
            Buffer.from(user.otpCode.padEnd(6, ' '))
        );

        if (!codeMatch) {
            await User.findByIdAndUpdate(user._id, { otpAttempts: attempts });
            const remaining = 5 - attempts;
            throw new Error(
                remaining > 0
                    ? `Code incorrect. Il vous reste ${remaining} tentative(s).`
                    : 'Code incorrect. Veuillez vous reconnecter.'
            );
        }

        // ── Code valide → Connexion complète ──────────────────
        const { token, refreshToken } = this._generateTokenPair(user._id, user.role);

        // Stocker le refresh token hashé + nettoyer l'OTP + MAJ lastLoginAt
        await User.findByIdAndUpdate(user._id, {
            otpCode:      null,
            otpExpires:   null,
            otpAttempts:  0,
            lastLoginAt:  new Date(),
            refreshToken: crypto.createHash('sha256').update(refreshToken).digest('hex'),
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
    // RENVOYER L'OTP
    // ─────────────────────────────────────────────────────────
    async resendOtp(tempToken) {
        if (!tempToken) throw new Error('Token requis');

        let decoded;
        try {
            decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        } catch {
            throw new Error('Session expirée. Veuillez vous reconnecter.');
        }

        if (decoded.type !== 'temp') throw new Error('Token invalide');

        const user = await User.findById(decoded.id).select('+otpExpires');
        if (!user) throw new Error('Utilisateur introuvable');

        // Anti-spam : attendre au moins 60 secondes entre deux renvois
        if (user.otpExpires && user.otpExpires > new Date(Date.now() + 9 * 60 * 1000)) {
            throw new Error('Veuillez attendre avant de demander un nouveau code.');
        }

        const otpCode    = generateOtp();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        await User.findByIdAndUpdate(user._id, {
            otpCode, otpExpires, otpAttempts: 0
        });

        await emailService.sendOtpEmail(user.email, otpCode, `${user.nom} ${user.prenom}`);

        // Nouveau token temp (reset timer 5 min)
        const { token: newTempToken } = this._generateTemp(user._id);

        return {
            success: true,
            tempToken: newTempToken,
            message: 'Nouveau code envoyé'
        };
    }

    // ─────────────────────────────────────────────────────────
    // REFRESH TOKEN
    // ─────────────────────────────────────────────────────────
    async refreshAccessToken(refreshToken) {
        if (!refreshToken) throw new Error('Refresh token requis');

        const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

        const user = await User.findOne({ refreshToken: hashedToken }).select('+refreshToken');
        if (!user) throw new Error('Session invalide ou expirée. Veuillez vous reconnecter.');

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
    // MISE À JOUR PROFIL
    // ─────────────────────────────────────────────────────────
    async updateProfile(userId, data) {
        const allowed = ['nom', 'prenom', 'classe', 'filiere', 'bio', 'photoUrl'];
        const update  = {};
        allowed.forEach(field => {
            if (data[field] !== undefined) update[field] = data[field];
        });

        const user = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true });
        if (!user) throw new Error('Utilisateur introuvable');

        return { success: true, user: this._formatUser(user), message: 'Profil mis à jour' };
    }

    // ─────────────────────────────────────────────────────────
    // CHANGEMENT DE MOT DE PASSE
    // ─────────────────────────────────────────────────────────
    async changePassword(userId, currentPassword, newPassword) {
        if (!currentPassword || !newPassword) {
            throw new Error('Les deux mots de passe sont requis');
        }
        if (newPassword.length < 8) {
            throw new Error('Le nouveau mot de passe doit contenir au moins 8 caractères');
        }

        const user = await User.findById(userId).select('+password');
        if (!user) throw new Error('Utilisateur introuvable');

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) throw new Error('Mot de passe actuel incorrect');

        await User.findByIdAndUpdate(userId, {
            password:     await bcrypt.hash(newPassword, 12),
            refreshToken: null // Invalider toutes les sessions
        });

        return { success: true, message: 'Mot de passe modifié avec succès' };
    }

    // ─────────────────────────────────────────────────────────
    // FORGOT PASSWORD
    // ─────────────────────────────────────────────────────────
    async forgotPassword(email) {
        if (!email) throw new Error('Email requis');

        if (!isDomainAccepted(email)) {
            throw new Error('Seules les adresses institutionnelles Saint-Jean sont acceptées');
        }

        // Réponse générique pour ne pas révéler si l'email existe
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Simuler un délai pour éviter l'énumération d'emails
            await new Promise(r => setTimeout(r, 500));
            return { success: true, message: 'Si cet email est enregistré, vous recevrez un lien.' };
        }

        const resetToken   = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h

        await User.findByIdAndUpdate(user._id, {
            resetPasswordToken:   crypto.createHash('sha256').update(resetToken).digest('hex'),
            resetPasswordExpires: resetExpires
        });

        try {
            await emailService.sendPasswordResetEmail(
                user.email,
                resetToken,
                `${user.nom} ${user.prenom}`
            );
        } catch (e) {
            console.error('❌ Email reset échoué:', e.message);
            await User.findByIdAndUpdate(user._id, {
                resetPasswordToken: null, resetPasswordExpires: null
            });
            throw new Error('Erreur lors de l\'envoi de l\'email. Réessayez dans quelques minutes.');
        }

        return { success: true, message: 'Si cet email est enregistré, vous recevrez un lien.' };
    }

    // ─────────────────────────────────────────────────────────
    // RESET PASSWORD
    // ─────────────────────────────────────────────────────────
    async resetPassword(token, newPassword) {
        if (!token || !newPassword) {
            throw new Error('Token et nouveau mot de passe requis');
        }
        if (newPassword.length < 8) {
            throw new Error('Le mot de passe doit contenir au moins 8 caractères');
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken:   hashedToken,
            resetPasswordExpires: { $gt: new Date() }
        }).select('+resetPasswordToken +resetPasswordExpires');

        if (!user) {
            throw new Error('Lien invalide ou expiré. Veuillez refaire une demande de réinitialisation.');
        }

        await User.findByIdAndUpdate(user._id, {
            password:             await bcrypt.hash(newPassword, 12),
            resetPasswordToken:   null,
            resetPasswordExpires: null,
            refreshToken:         null, // Déconnecter toutes les sessions
        });

        return { success: true, message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.' };
    }

    // ─────────────────────────────────────────────────────────
    // VERIFY EMAIL
    // ─────────────────────────────────────────────────────────
    async verifyEmail(token) {
        const user = await User.findOne({
            emailVerificationToken:   token,
            emailVerificationExpires: { $gt: new Date() }
        }).select('+emailVerificationToken +emailVerificationExpires');

        if (!user) {
            throw new Error('Lien de vérification invalide ou expiré');
        }

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

    _generateTemp(userId) {
        if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET non défini');
        const token = jwt.sign(
            { id: userId, type: 'temp' },
            process.env.JWT_SECRET,
            { expiresIn: '15m' } // 15 min pour saisir le code
        );
        return { token };
    }

    _formatUser(user) {
        return {
            id:              user._id,
            name:            `${user.nom} ${user.prenom}`,
            email:           user.email,
            role:            user.role,
            classe:          user.classe,
            filiere:         user.filiere,
            bio:             user.bio || '',
            photoUrl:        user.photoUrl || null,
            twoFactorEnabled: true,
            isEmailVerified: user.isEmailVerified || false,
        };
    }
}

module.exports = new AuthService();