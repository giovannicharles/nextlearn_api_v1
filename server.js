// server.js
require('dotenv').config();

const mongoose = require('mongoose');
const app      = require('./src/app');
const bcrypt   = require('bcryptjs');
const User     = require('./src/modules/user/user.model');

const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoURI) {
    console.error('❌ MongoDB URI manquant — définissez MONGODB_URI dans .env');
    process.exit(1);
}

const maskedURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
console.log('📡 Connexion à MongoDB...');
console.log('🔗 URI:', maskedURI);

const options = { serverSelectionTimeoutMS: 10000, socketTimeoutMS: 45000, family: 4 };

// ── Admins par défaut (@nextlearn.org exempt du filtre Saint-Jean) ──
const createDefaultAdmins = async () => {
    const admins = [
        {
            nom: 'Admin', prenom: 'Principal',
            email:    'admin@nextlearn.org',
            password: process.env.ADMIN_PASSWORD  || 'Admin123!',
            role: 'admin', classe: '', filiere: '',
            isEmailVerified: true, twoFactorEnabled: true,
        },
        {
            nom: 'Admin', prenom: 'Secondaire',
            email:    'admin2@nextlearn.org',
            password: process.env.ADMIN2_PASSWORD || 'Admin123!',
            role: 'admin', classe: '', filiere: '',
            isEmailVerified: true, twoFactorEnabled: true,
        },
    ];

    for (const data of admins) {
        const exists = await User.findOne({ email: data.email });
        if (!exists) {
            const hashed = await bcrypt.hash(data.password, 10);
            await new User({ ...data, password: hashed }).save();
            console.log(`✅ Admin créé : ${data.email}`);
        } else {
            console.log(`ℹ️  Admin existant : ${data.email}`);
        }
    }
};

mongoose.connect(mongoURI, options)
    .then(async () => {
        console.log('✅ MongoDB connecté');
        await createDefaultAdmins();

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`🚀 Serveur : http://localhost:${PORT}`);
            console.log(`📚 Docs    : http://localhost:${PORT}/api-docs`);
            console.log(`❤️  Health  : http://localhost:${PORT}/health`);
        });
    })
    .catch(err => {
        console.error('❌ Erreur MongoDB:', err.message);
        setTimeout(() => mongoose.connect(mongoURI, options), 5000);
    });

mongoose.connection.on('disconnected', () => console.log('⚠️  MongoDB déconnecté'));
mongoose.connection.on('error', err => console.error('❌ MongoDB:', err.message));

process.on('SIGINT',  async () => { await mongoose.connection.close(); process.exit(0); });
process.on('SIGTERM', async () => { await mongoose.connection.close(); process.exit(0); });