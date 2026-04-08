// server.js
require('dotenv').config();

const mongoose = require('mongoose');
const app      = require('./src/app');
const bcrypt   = require('bcryptjs');
const User     = require('./src/modules/user/user.model');

// ── Vérification de la config ─────────────────────────────────
const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoURI) {
    console.error('❌ Erreur: Variable MongoDB non définie dans le fichier .env');
    console.error('   Veuillez définir MONGODB_URI ou MONGO_URI dans votre fichier .env');
    process.exit(1);
}

const maskedURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
console.log('📡 Tentative de connexion à MongoDB...');
console.log('🔗 URI:', maskedURI);

const options = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS:          45000,
    family:                   4,
};

// ── Création des comptes admin par défaut ─────────────────────
// Les admins utilisent @nextlearn.org (exempté de la restriction Saint-Jean)
const createDefaultAdmins = async () => {
    try {
        const admins = [
            {
                nom:             'Admin',
                prenom:          'Principal',
                email:           'admin@nextlearn.org',
                password:        process.env.ADMIN_PASSWORD || 'Admin123!',
                role:            'admin',
                classe:          '',
                filiere:         '',
                isEmailVerified: true,
                twoFactorEnabled: true,
            },
            {
                nom:             'Admin',
                prenom:          'Secondaire',
                email:           'admin2@nextlearn.org',
                password:        process.env.ADMIN2_PASSWORD || 'Admin123!',
                role:            'admin',
                classe:          '',
                filiere:         '',
                isEmailVerified: true,
                twoFactorEnabled: true,
            },
        ];

        for (const adminData of admins) {
            const existingAdmin = await User.findOne({ email: adminData.email });

            if (!existingAdmin) {
                const hashedPassword = await bcrypt.hash(adminData.password, 10);
                const admin = new User({ ...adminData, password: hashedPassword });
                await admin.save();
                console.log(`✅ Admin créé: ${adminData.email}`);
            } else {
                console.log(`ℹ️  Admin déjà existant: ${adminData.email}`);
            }
        }
    } catch (error) {
        console.error('❌ Erreur création des admins:', error.message);
    }
};

// ── Connexion MongoDB ─────────────────────────────────────────
mongoose.connect(mongoURI, options)
    .then(async () => {
        console.log('✅ MongoDB connecté avec succès');

        await createDefaultAdmins();

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`🚀 Serveur lancé sur le port ${PORT}`);
            console.log(`📚 Documentation: http://localhost:${PORT}/api-docs`);
            console.log(`❤️  Health check:  http://localhost:${PORT}/health`);
        });
    })
    .catch(err => {
        console.error('❌ Erreur MongoDB:', err.message);
        console.log('🔄 Nouvelle tentative dans 5 secondes...');
        setTimeout(() => mongoose.connect(mongoURI, options), 5000);
    });

// ── Événements connexion ──────────────────────────────────────
mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB déconnecté. Reconnexion...');
});

mongoose.connection.on('error', err => {
    console.error('❌ Erreur MongoDB:', err.message);
});

// ── Arrêt gracieux ────────────────────────────────────────────
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🛑 Serveur arrêté');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await mongoose.connection.close();
    console.log('🛑 Serveur arrêté (SIGTERM)');
    process.exit(0);
});