import { app, settingService, roleService, verificationService, verificationAdminService } from './app';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { ensureIndexes } from './config/indexes';
import env from './config/env';

// La connexion MongoDB Atlas subit parfois des coupures réseau transitoires
// (ECONNRESET) qui remontent comme rejets de promesse non gérés depuis le
// driver Mongo lui-même, en dehors de la portée des try/catch de l'appli —
// sans ce filet, Node arrête tout le process sur ces erreurs pourtant
// non-fatales (la reconnexion automatique de Mongoose s'en charge).
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled rejection (process maintenu en vie) :', reason);
});
process.on('uncaughtException', (error) => {
  console.error('⚠️  Uncaught exception (process maintenu en vie) :', error);
});

const PORT = env.PORT || process.env.PORT || 5000;

const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 NextLearn API v2 running on port ${PORT}`);
  console.log(`📍 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
});

/**
 * Purge quotidienne des justificatifs dont le délai de rétention est écoulé.
 *
 * Un simple intervalle plutôt qu'une file BullMQ : la tâche est idempotente,
 * peu fréquente, et ne justifie pas une dépendance à Redis pour tourner. Un
 * premier passage a lieu peu après le démarrage, pour rattraper les purges
 * manquées pendant un arrêt du service.
 */
const startJustificatifPurge = () => {
  const runPurge = async () => {
    try {
      const purged = await verificationService.purgeExpiredJustificatifs();
      if (purged > 0) console.log(`🧹 ${purged} justificatif(s) purgé(s)`);
    } catch (error) {
      console.error('Échec de la purge des justificatifs :', error);
    }
  };

  setTimeout(runPurge, 60_000).unref();
  setInterval(runPurge, 24 * 60 * 60 * 1000).unref();
};

/**
 * Détection horaire des dossiers hors délai SLA.
 *
 * Identifie les dossiers dont l'échéance de 48h est dépassée sans décision,
 * notifie les admins-réviseurs (notification in-app + email), et marque le
 * dossier comme escaladé pour éviter les notifications répétées.
 */
const startSlaEscalation = () => {
  const runEscalation = async () => {
    try {
      const count = await verificationAdminService.detectSlaBreaches();
      if (count > 0) console.log(`⚠️  ${count} dossier(s) hors délai SLA escaladé(s)`);
    } catch (error) {
      console.error('Échec de la détection SLA :', error);
    }
  };

  setTimeout(runEscalation, 120_000).unref();
  setInterval(runEscalation, 60 * 60 * 1000).unref();
};

const initServices = async () => {
  try {
    await connectDatabase();
    connectRedis();
    await ensureIndexes();
    await settingService.seedDefaults();
    await roleService.seedDefaults();
    startJustificatifPurge();
    startSlaEscalation();
  } catch (error) {
    console.error('Failed to init services:', error);
    console.log('⚠️  Server running but database not connected. Retrying in 5s...');
    setTimeout(initServices, 5000);
  }
};

initServices();

export { server };
