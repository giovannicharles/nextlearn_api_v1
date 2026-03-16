require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./src/app');

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connecté");

    // Démarrage du serveur seulement après la connexion DB
    app.listen(process.env.PORT, () => {
      console.log(`Serveur lancé sur le port ${process.env.PORT}`); 
    });
  })
  .catch(err => console.log("Erreur MongoDB:", err));