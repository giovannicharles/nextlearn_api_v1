import dns from 'dns';
import mongoose from 'mongoose';
import env from './env';

// Le résolveur DNS interne de Node (c-ares) échoue parfois sur les requêtes
// SRV (utilisées par `mongodb+srv://`) alors que le résolveur du système
// fonctionne très bien — problème connu sous Windows. On force Node à passer
// par des DNS publics fiables pour éviter les timeouts `querySrv ETIMEOUT`.
dns.setServers(['8.8.8.8', '1.1.1.1']);

// Écouteurs enregistrés une seule fois (pas à chaque appel de connectDatabase)
// pour éviter un empilement de listeners qui déclenchait une tempête de
// reconnexions à chaque coupure réseau transitoire (des centaines de tentatives
// en boucle, chacune saturant le pool et provoquant des 500 en cascade).
let reconnectTimer: NodeJS.Timeout | null = null;
let listenersRegistered = false;

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectDatabase().catch(() => scheduleReconnect());
  }, 5000);
}

function registerConnectionListeners(): void {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB disconnected');
    scheduleReconnect();
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err.message);
  });
}

const connectDatabase = async (): Promise<void> => {
  registerConnectionListeners();

  if (mongoose.connection.readyState === 1) return; // déjà connecté

  try {
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4 as const,
    };

    await mongoose.connect(env.MONGODB_URI, options);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error instanceof Error ? error.message : error);
    throw error;
  }
};

const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting MongoDB:', error instanceof Error ? error.message : error);
  }
};

export { connectDatabase, disconnectDatabase };
