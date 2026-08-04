export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`ℹ️  [${new Date().toISOString()}] ${message}`, meta || '');
  },
  error: (message: string, error?: any) => {
    console.error(`❌ [${new Date().toISOString()}] ${message}`, error || '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`⚠️  [${new Date().toISOString()}] ${message}`, meta || '');
  },
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`🔍 [${new Date().toISOString()}] ${message}`, meta || '');
    }
  },
};
