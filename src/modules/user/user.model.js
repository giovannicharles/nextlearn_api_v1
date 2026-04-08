// src/modules/user/user.model.js
const mongoose = require('mongoose');
const { userRole } = require('./user.enum');

const userSchema = new mongoose.Schema({
    nom: {
        type: String,
        required: true,
        trim: true
    },
    prenom: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: true // Force la sélection par défaut
    },
    role: {
        type: String,
        enum: Object.values(userRole),
        default: userRole.student
    },
    classe: {
        type: String,
        default: ''
    },
    filiere: {
        type: String,
        default: ''
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },

    // ── 2FA (TOTP via Google Authenticator / Authy) ───────────
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String,
        default: null,
        select: false // Jamais exposé dans les réponses par défaut
    },

    // ── Réinitialisation de mot de passe ──────────────────────
    resetPasswordToken: {
        type: String,
        default: null,
        select: false
    },
    resetPasswordExpires: {
        type: Date,
        default: null,
        select: false
    },

    // ── Vérification email ────────────────────────────────────
    emailVerificationToken: {
        type: String,
        default: null,
        select: false
    },
    emailVerificationExpires: {
        type: Date,
        default: null,
        select: false
    },

    // ── Refresh token (pour l'intercepteur Angular) ───────────
    refreshToken: {
        type: String,
        default: null,
        select: false
    },

    // ── Profil complémentaire ─────────────────────────────────
    bio: {
        type: String,
        default: '',
        maxlength: 500
    },
    photoUrl: {
        type: String,
        default: null
    },

    // ── Sécurité ──────────────────────────────────────────────
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: null
    },
    lastLoginAt: {
        type: Date,
        default: null
    }

}, {
    timestamps: true, // Ajoute createdAt et updatedAt automatiquement
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.twoFactorSecret;
            delete ret.resetPasswordToken;
            delete ret.resetPasswordExpires;
            delete ret.emailVerificationToken;
            delete ret.emailVerificationExpires;
            delete ret.refreshToken;
            delete ret.loginAttempts;
            delete ret.lockUntil;
            delete ret.__v;
            return ret;
        }
    },
    toObject: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.twoFactorSecret;
            delete ret.__v;
            return ret;
        }
    }
});

// ── Index pour les performances ───────────────────────────────
// userSchema.index({ email: 1 });
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ emailVerificationToken: 1 });

// ── Méthode : vérifier si le compte est verrouillé ────────────
userSchema.methods.isLocked = function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

// NE PAS ajouter de middleware 'pre' ou 'post' qui supprime le mot de passe

const User = mongoose.model('User', userSchema);
module.exports = User;