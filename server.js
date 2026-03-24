require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./src/app');
const bcrypt = require('bcryptjs');
const User = require('./src/modules/user/user.model');

// Vérifier que l'URI est défini
const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoURI) {
    console.error('❌ Erreur: Variable MongoDB non définie dans le fichier .env');
    console.error('📁 Veuillez définir MONGODB_URI ou MONGO_URI dans votre fichier .env');
    process.exit(1);
}

console.log('📡 Tentative de connexion à MongoDB...');
// Masquer le mot de passe dans les logs
const maskedURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
console.log('🔗 URI:', maskedURI);

// Options pour Mongoose (sans les options obsolètes)
const options = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,
};

// Fonction pour créer les admins par défaut
const createDefaultAdmins = async () => {
    try {
        const admins = [
            {
                nom: 'Admin',
                prenom: 'Principal',
                email: 'admin@nextlearn.org',
                password: 'Admin123!',
                role: 'admin',
                classe: '',
                filiere: '',
                isEmailVerified: true
            },
            {
                nom: 'Admin',
                prenom: 'Secondaire',
                email: 'admin2@nextlearn.org',
                password: 'Admin123!',
                role: 'admin',
                classe: '',
                filiere: '',
                isEmailVerified: true
            }
        ];

        for (const adminData of admins) {
            // Vérifier si l'admin existe déjà
            const existingAdmin = await User.findOne({ email: adminData.email });
            
            if (!existingAdmin) {
                // Hasher le mot de passe
                const hashedPassword = await bcrypt.hash(adminData.password, 10);
                
                // Créer l'admin
                const admin = new User({
                    ...adminData,
                    password: hashedPassword
                });
                
                await admin.save();
                console.log(`✅ Admin créé: ${adminData.email}`);
            } else {
                console.log(`ℹ️ L'admin ${adminData.email} existe déjà`);
            }
        }
    } catch (error) {
        console.error('❌ Erreur création des admins:', error);
    }
};

// Connexion MongoDB
mongoose.connect(mongoURI, options)
  .then(async () => {
    console.log("✅ MongoDB connecté avec succès");
    
    // Créer les admins par défaut après connexion
    await createDefaultAdmins();

    // Démarrage du serveur
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Serveur lancé sur le port ${PORT}`);
      console.log(`📚 Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`❤️ Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch(err => {
    console.error("❌ Erreur MongoDB:", err.message);
    console.log("🔄 Nouvelle tentative dans 5 secondes...");
    setTimeout(() => {
        mongoose.connect(mongoURI, options);
    }, 5000);
  });

// Gestion des événements de connexion
mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB déconnecté. Reconnexion...');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Erreur MongoDB:', err.message);
});

// Arrêt gracieux
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🛑 Serveur arrêté');
    process.exit(0);
});