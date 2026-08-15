import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { disconnectDatabase, connectDatabase } from './config/database';
import { disconnectRedis, connectRedis } from './config/redis';
import { errorHandler } from './shared/http/error.middleware';
import { swaggerSpec, swaggerUiServe, swaggerUiSetup } from './config/swagger';
import { globalRateLimiter, authRateLimiter, otpRateLimiter } from './middleware/rate-limit.middleware';
import { performanceMonitor } from './middleware/performance.middleware';
import { createAuthRoutes, AuthService, AuthController } from './modules/auth/index';
import { createReferencesRoutes, ReferencesService, ReferencesController } from './modules/references/index';
import { createDocumentRoutes, DocumentService, DocumentController } from './modules/documents/index';
import { createFavoriteRoutes, FavoriteService, FavoriteController } from './modules/favorites/index';
import { createProgressRoutes, ProgressService, ProgressController } from './modules/progress/index';
import { createOfflineRoutes, OfflineService, OfflineController } from './modules/offline/index';
import { createEpreuveRoutes, EpreuveService, EpreuveController } from './modules/epreuves/index';
import { createQuizRoutes, QuizService, QuizController } from './modules/quiz/index';
import { createProgressionRoutes, ProgressionService, ProgressionController } from './modules/progression/index';
import { createNotificationRoutes, NotificationService, NotificationController } from './modules/notifications/index';
import { createSyncRoutes, SyncService, SyncController } from './modules/sync/index';
import { createUserRoutes, UserService, UserController } from './modules/users/index';
import { createProfileRoutes } from './modules/users/profile.routes';
import { createAdminRoutes } from './modules/admin/admin.routes';
import { SettingService, SettingController, createSettingRoutes } from './modules/settings';
import { RoleService, RoleController, createRoleRoutes } from './modules/roles';
import { SupportService, SupportController, createSupportRoutes, createAdminSupportRoutes } from './modules/support';
import {
  VerificationService,
  VerificationController,
  createVerificationRoutes,
  VerificationAdminService,
  VerificationAdminController,
  createVerificationAdminRoutes,
} from './modules/verification';
import { authGuard, adminGuard } from './middleware/auth.guard';
import { maintenanceGuard } from './middleware/maintenance.middleware';
import { AuthRepository } from './infrastructure/repositories/auth.repository.impl';
import { ReferencesRepository } from './infrastructure/repositories/references.repository.impl';
import { DocumentRepository } from './infrastructure/repositories/document.repository.impl';
import { FavoriteRepository } from './infrastructure/repositories/favorite.repository.impl';
import { ProgressRepository } from './infrastructure/repositories/progress.repository.impl';
import { OfflineRepository } from './infrastructure/repositories/offline.repository.impl';
import { EpreuveRepository } from './infrastructure/repositories/epreuve.repository.impl';
import { QuizRepository } from './infrastructure/repositories/quiz.repository.impl';
import { ProgressionRepository } from './infrastructure/repositories/progression.repository.impl';
import { NotificationRepository } from './infrastructure/repositories/notification.repository.impl';
import { SyncRepository } from './infrastructure/repositories/sync.repository.impl';
import { UserRepository } from './infrastructure/repositories/user.repository.impl';
import { SendGridMailerService } from './infrastructure/mailer/sendgrid.mailer.impl';
import { SmtpMailerService } from './infrastructure/mailer/smtp.mailer.impl';
import { CloudinaryStorageService } from './infrastructure/storage/cloudinary.storage.impl';
import env from './config/env';

const app = express();

// Middleware
// Disable helmet in development to avoid CSP issues
if (env.NODE_ENV !== 'development') {
  app.use(helmet());
}
app.use(cors({
  origin: function (origin, callback) {
    // En développement, autoriser tout
    if (env.NODE_ENV === 'development') {
      console.log(`[CORS] Development mode - allowing origin: ${origin}`);
      return callback(null, true);
    }

    const allowed = [
      'http://localhost:4200',
      'http://localhost:8100',
      'http://localhost:8080',
      'http://localhost',
      'https://localhost:8100',
      'capacitor://localhost',
      'ionic://localhost',
      'http://localhost:5000',
    ];

    // URLs de production depuis env (séparées par virgules)
    const extraOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    extraOrigins.forEach(o => allowed.push(o));

    // En production, autoriser aussi les sous-domaines Render
    const renderPattern = /^https:\/\/.*\.onrender\.com$/;
    // Dev local : autoriser tout port localhost (flutter run -d chrome/web-server
    // choisit un port dynamique) — évite de devoir whitelister chaque port à la main.
    const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;

    if (
      !origin ||
      allowed.includes(origin) ||
      origin.startsWith('file://') ||
      renderPattern.test(origin) ||
      localhostPattern.test(origin)
    ) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(performanceMonitor);
app.use(morgan('dev'));

// Global rate limiter on all /api routes (disabled in development)
if (env.NODE_ENV !== 'development') {
  app.use('/api', globalRateLimiter);
}

// Maintenance mode check (bypasses health, docs, settings/public, auth) - disabled in development
if (env.NODE_ENV !== 'development') {
  app.use('/api', maintenanceGuard);
}

// Add debug logging for development
if (env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
    next();
  });
}

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    environment: env.NODE_ENV,
    version: '2.0.0',
  });
});

// Root route
app.get('/', (_req, res) => {
  res.json({
    name: 'NextLearn API v2',
    version: '2.0.0',
    status: 'OK',
    docs: '/api-docs',
    health: '/health',
  });
});

// Swagger Documentation
app.use('/api-docs', swaggerUiServe, swaggerUiSetup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Dependency Injection — Mailer: SendGrid si API key, sinon SMTP
const mailerService = env.SENDGRID_API_KEY
  ? new SendGridMailerService()
  : new SmtpMailerService();
const storageService = new CloudinaryStorageService();

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository, mailerService);
const authController = new AuthController(authService);

const referencesRepository = new ReferencesRepository();
const referencesService = new ReferencesService(referencesRepository);
const referencesController = new ReferencesController(referencesService);

const documentRepository = new DocumentRepository();
const documentService = new DocumentService(documentRepository, storageService);
const documentController = new DocumentController(documentService);

const favoriteRepository = new FavoriteRepository();
const favoriteService = new FavoriteService(favoriteRepository);
const favoriteController = new FavoriteController(favoriteService);

const progressRepository = new ProgressRepository();
const progressService = new ProgressService(progressRepository);
const progressController = new ProgressController(progressService);

const offlineRepository = new OfflineRepository();
const offlineService = new OfflineService(offlineRepository);
const offlineController = new OfflineController(offlineService);

const epreuveRepository = new EpreuveRepository();
const epreuveService = new EpreuveService(epreuveRepository, storageService);
const epreuveController = new EpreuveController(epreuveService);

const quizRepository = new QuizRepository();
const quizService = new QuizService(quizRepository);
const quizController = new QuizController(quizService);

const progressionRepository = new ProgressionRepository();
const progressionService = new ProgressionService(progressionRepository);
const progressionController = new ProgressionController(progressionService);

const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);
const notificationController = new NotificationController(notificationService);

const syncRepository = new SyncRepository();
const syncService = new SyncService(syncRepository);
const syncController = new SyncController(syncService);

const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

const settingService = new SettingService();
const settingController = new SettingController(settingService);

const roleService = new RoleService();
const roleController = new RoleController(roleService);
const supportService = new SupportService();
const supportController = new SupportController(supportService);
const verificationService = new VerificationService(storageService, mailerService);
const verificationController = new VerificationController(verificationService);
const verificationAdminService = new VerificationAdminService(storageService, mailerService);
const verificationAdminController = new VerificationAdminController(verificationAdminService);

// Routes selon la spécification
app.use('/api/auth', authRateLimiter, createAuthRoutes(authController));
app.use('/api/references', createReferencesRoutes(referencesController));
app.use('/api/documents', createDocumentRoutes(documentController));
app.use('/api/favorites', createFavoriteRoutes(favoriteController));
app.use('/api/progress', createProgressRoutes(progressController));
app.use('/api/offline', createOfflineRoutes(offlineController));
app.use('/api/epreuves', createEpreuveRoutes(epreuveController));
app.use('/api/quiz', createQuizRoutes(quizController));
app.use('/api/progression', createProgressionRoutes(progressionController));
app.use('/api/notifications', createNotificationRoutes(notificationController));
app.use('/api/sync', createSyncRoutes(syncController));
app.use('/api/users', createUserRoutes(userController));
app.use('/api/profile', createProfileRoutes(userController));
app.use('/api/admin', createAdminRoutes(documentController, epreuveController, quizController, referencesController, userController, notificationController));
app.use('/api/settings', createSettingRoutes(settingController));
app.use('/api/roles', createRoleRoutes(roleController));
app.use('/api/support', createSupportRoutes(supportController));
app.use('/api/verification', createVerificationRoutes(verificationController));
// Back-office des dossiers : réservé aux administrateurs-réviseurs.
app.use('/api/admin/verification', authGuard, adminGuard, createVerificationAdminRoutes(verificationAdminController, verificationAdminService));
// File de traitement et actions correctives, réservées à l'administration.
app.use('/api/admin/support', authGuard, adminGuard, createAdminSupportRoutes(supportController));

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route non trouvée' } });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Closing server gracefully...`);
  await disconnectDatabase();
  await disconnectRedis();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app, settingService, roleService, verificationService, verificationAdminService };
