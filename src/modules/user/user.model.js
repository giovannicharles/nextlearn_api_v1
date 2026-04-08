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
        select: true
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

    // ── OTP email (2FA obligatoire à chaque connexion) ────────
    otpCode: {
        type: String,
        default: null,
        select: false
    },
    otpExpires: {
        type: Date,
        default: null,
        select: false
    },
    otpAttempts: {
        type: Number,
        default: 0,
        select: false
    },

    // ── Champ conservé pour compatibilité frontend ────────────
    twoFactorEnabled: {
        type: Boolean,
        default: true  // toujours true car OTP obligatoire
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

    // ── Vérification email à l'inscription ────────────────────
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

    // ── Refresh token (rotation) ──────────────────────────────
    refreshToken: {
        type: String,
        default: null,
        select: false
    },

    // ── Profil ────────────────────────────────────────────────
    bio: {
        type: String,
        default: '',
        maxlength: 500
    },
    photoUrl: {
        type: String,
        default: null
    },

    // ── Sécurité brute-force ──────────────────────────────────
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
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.otpCode;
            delete ret.otpExpires;
            delete ret.otpAttempts;
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
            delete ret.otpCode;
            delete ret.otpExpires;
            delete ret.__v;
            return ret;
        }
    }
});

// userSchema.index({ email: 1 });
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ emailVerificationToken: 1 });

userSchema.methods.isLocked = function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

const User = mongoose.model('User', userSchema);
module.exports = User;