const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Import des routes
const authRoutes = require('./modules/auth/auth.routes');
const documentRoutes = require('./modules/document/document.routes');

const app = express();
const setupSwagger = require('./swagger');

// ===== Middleware pour forcer HTTPS en production =====
app.use((req, res, next) => {
    // Forcer HTTPS sur Render
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
});

// ===== Configuration CORS =====
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'http://localhost:4200',
            'http://localhost:8100',
            'http://localhost:8101',
            'http://localhost:8102',
            'http://localhost:8103',
            'capacitor://localhost',
            'ionic://localhost',
            'http://localhost',
            'https://localhost',
            'file://',
            'https://nextlearn-api-v1.onrender.com'
        ];

        if (allowedOrigins.includes(origin) || origin.startsWith('file://')) {
            callback(null, true);
        } else if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
            console.warn('⚠️ CORS - localhost autorisé en dev:', origin);
            callback(null, true);
        } else {
            console.log('🔒 CORS - Origine:', origin);
            callback(null, true);
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Length', 'Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// ===== Logger simple =====
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const start = Date.now();

    console.log(`📨 [${new Date().toISOString()}] ${req.method} ${req.path} - Origine: ${origin || 'inconnue'}`);

    res.on('finish', () => {
        console.log(`📤 [${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${Date.now() - start}ms`);
    });

    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// ===== Middlewares =====
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===== Statics avec en-têtes CORS =====
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');

app.use('/uploads', express.static(uploadDir, {
    setHeaders: (res, filePath) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

app.use('/public', express.static(path.join(__dirname, 'public')));
setupSwagger(app);

// ===== Connexion MongoDB =====
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        
        if (!mongoURI) {
            console.error('❌ MONGODB_URI non définie');
            return;
        }

        console.log('📡 Tentative de connexion à MongoDB...');

        const options = {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            family: 4,
        };

        await mongoose.connect(mongoURI, options);
        console.log('✅ Connexion MongoDB établie avec succès');
        
        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB déconnecté. Reconnexion...');
            setTimeout(connectDB, 5000);
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ Erreur MongoDB:', err.message);
        });

    } catch (error) {
        console.error('❌ Erreur de connexion MongoDB:', error.message);
        console.log('🔄 Nouvelle tentative dans 5 secondes...');
        setTimeout(connectDB, 5000);
    }
};

connectDB();

// ===== Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        cors: 'configuré',
        uploadDir: process.env.UPLOAD_DIR || 'uploads'
    });
});

app.get('/', (req, res) => {
    res.json({
        message: 'API NextLearn opérationnelle',
        documentation: '/api-docs',
        health: '/health',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            documents: '/api/documents',
            users: '/api/users',
            quizzes: '/api/quizzes'
        }
    });
});

// ===== Gestion des uploads =====
app.get('/api/uploads/list', (req, res) => {
    const fs = require('fs');

    fs.readdir(uploadDir, { withFileTypes: true }, (err, files) => {
        if (err) return res.status(500).json({ error: 'Impossible de lister les fichiers' });

        const result = files.map(file => {
            const filePath = path.join(uploadDir, file.name);
            let stats = {};
            try { stats = fs.statSync(filePath); } catch (e) {}
            return { name: file.name, isDirectory: file.isDirectory(), size: stats.size, modified: stats.mtime };
        });

        res.json(result);
    });
});

// ===== Gestion des erreurs =====
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée', path: req.path, method: req.method });
});

app.use((err, req, res, next) => {
    console.error('❌ Erreur:', err);
    if (err.name === 'ValidationError') return res.status(400).json({ error: 'Erreur de validation', details: err.errors });
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Token invalide' });
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expiré' });
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Fichier trop volumineux' });
    if (err.code === 'FILE_TYPE_ERROR') return res.status(400).json({ error: err.message });

    res.status(err.status || 500).json({ error: err.message || 'Erreur interne du serveur', ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) });
});

// ===== Initialisation des dossiers =====
const fs = require('fs');
const dirs = [
    uploadDir,
    path.join(uploadDir, 'documents'),
    path.join(uploadDir, 'temp'),
    path.join(__dirname, '../logs')
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Dossier créé: ${dir}`);
    }
});

module.exports = app;