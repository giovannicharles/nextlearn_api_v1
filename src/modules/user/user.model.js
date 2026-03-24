// user.model.js
const mongoose = require('mongoose');
const { userRole } = require('./user.enum');

const userSchema = new mongoose.Schema({
    nom: { 
        type: String, 
        required: true 
    },
    prenom: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true 
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
    twoFactorEnabled: { 
        type: Boolean, 
        default: false 
    }
}, {
    timestamps: true, // Ajoute createdAt et updatedAt automatiquement
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password; // Supprime le mot de passe à la conversion JSON
            delete ret.__v;
            return ret;
        }
    },
    toObject: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.__v;
            return ret;
        }
    }
});

// NE PAS ajouter de middleware 'pre' ou 'post' qui supprime le mot de passe

const User = mongoose.model('User', userSchema);
module.exports = User;