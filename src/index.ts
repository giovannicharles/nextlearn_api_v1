import { app } from './app';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { ensureIndexes } from './config/indexes';
import env from './config/env';

const startServer = async () => {
  try {
    await connectDatabase();
    connectRedis();
    await ensureIndexes();

    const PORT = env.PORT;
    app.listen(PORT, () => {
      console.log(`🚀 NextLearn API v2 running on port ${PORT}`);
      console.log(`📍 Environment: ${env.NODE_ENV}`);
      console.log(`🔗 Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
