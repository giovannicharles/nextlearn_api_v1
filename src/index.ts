import { app } from './app';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { ensureIndexes } from './config/indexes';
import env from './config/env';

const PORT = env.PORT || process.env.PORT || 5000;

const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 NextLearn API v2 running on port ${PORT}`);
  console.log(`📍 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
});

const initServices = async () => {
  try {
    await connectDatabase();
    connectRedis();
    await ensureIndexes();
  } catch (error) {
    console.error('Failed to init services:', error);
    console.log('⚠️  Server running but database not connected. Retrying in 5s...');
    setTimeout(initServices, 5000);
  }
};

initServices();

export { server };
