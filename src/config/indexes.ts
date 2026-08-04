import mongoose from 'mongoose';

/**
 * Ensure MongoDB indexes are created for optimal query performance.
 * Call this after database connection is established.
 */
export const ensureIndexes = async (): Promise<void> => {
  try {
    await mongoose.connection.syncIndexes();
    console.log('✅ MongoDB indexes synced');
  } catch (error) {
    console.error('❌ Index sync failed:', error instanceof Error ? error.message : error);
  }
};
