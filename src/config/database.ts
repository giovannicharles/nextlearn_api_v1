import mongoose from 'mongoose';
import env from './env';

const connectDatabase = async (): Promise<void> => {
  try {
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4 as const,
    };

    await mongoose.connect(env.MONGODB_URI, options);
    console.log('✅ MongoDB connected');

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
      setTimeout(() => connectDatabase(), 5000);
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
    });

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
