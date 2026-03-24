const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../user/user.model');
const { userRole } = require('../user/user.enum');

class AuthService {
    async register(data) {
        console.log('🔍 DONNÉES REÇUES DANS LE BACKEND:', JSON.stringify(data, null, 2));
        
        const { nom, prenom, email, password, classe, filiere } = data;

        if (!nom || !prenom || !email || !password) {
            throw new Error('Nom, Prénom, email et mot de passe sont requis');
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            throw new Error('Un utilisateur avec cet email existe déjà');
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('🔐 Mot de passe hashé (longueur):', hashedPassword.length);

        const userData = {
            nom,
            prenom,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: userRole.student,
            classe: classe || '',
            filiere: filiere || '',
            isEmailVerified: false,
            twoFactorEnabled: false
        };

        console.log('📦 Données à sauvegarder:', {
            ...userData,
            password: hashedPassword.substring(0, 20) + '...'
        });

        const user = await User.create(userData);
        console.log('✅ Utilisateur créé avec ID:', user._id);

        // Vérification
        const db = mongoose.connection.db;
        const collection = db.collection('users');
        const rawUser = await collection.findOne({ _id: user._id });
        
        if (!rawUser || !rawUser.password) {
            console.error('❌ CRITIQUE: Le mot de passe n\'a pas été sauvegardé en base!');
        }

        // Générer le token AVEC LE RÔLE
        const token = this.generateToken(user._id, user.role);

        return {
            success: true,
            user: {
                id: user._id,
                name: `${user.nom} ${user.prenom}`,
                email: user.email,
                role: user.role,
                classe: user.classe,
                filiere: user.filiere
            },
            token,
            message: "Le compte de l'utilisateur a été créé."
        };
    }

    async login(email, password) {
        if (!email || !password) {
            throw new Error('Email et mot de passe sont requis');
        }

        console.log('🔍 Tentative de connexion pour:', email);

        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        
        console.log('👤 Utilisateur trouvé:', user ? 'Oui' : 'Non');
        
        if (!user) {
            throw new Error('Email ou mot de passe incorrect');
        }

        console.log('🔑 Password présent:', user.password ? 'Oui' : 'NON');
        console.log('🔑 Type password:', typeof user.password);
        console.log('🔑 Longueur password:', user.password?.length || 0);

        if (!user.password) {
            console.error('❌ ERREUR: Mot de passe manquant en base');
            throw new Error('Email ou mot de passe incorrect');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('🔐 Mot de passe valide:', isPasswordValid ? 'Oui' : 'Non');

        if (!isPasswordValid) {
            throw new Error('Email ou mot de passe incorrect');
        }

        // Générer le token AVEC LE RÔLE
        const token = this.generateToken(user._id, user.role);

        return {
            success: true,
            user: {
                id: user._id,
                name: `${user.nom} ${user.prenom}`,
                email: user.email,
                role: user.role,
                classe: user.classe,
                filiere: user.filiere
            },
            message: "Connexion réussie",
            token
        };
    }

    generateToken(userId, role) {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET non défini');
        }
        // Ajouter le rôle dans le token
        return jwt.sign(
            { id: userId, role: role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );
    }
}

module.exports = new AuthService();