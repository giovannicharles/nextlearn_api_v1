// src/app.js — VERSION MISE À JOUR AVEC ADMIN
// Remplacez votre app.js existant par ce fichier
// Les seuls ajouts par rapport à l'original sont marqués ← ADMIN

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes     = require('./modules/auth/auth.routes');
const documentRoutes = require('./modules/document/document.routes');
const adminRoutes    = require('./modules/admin/admin.routes');     // ← ADMIN

const app = express();
const setupSwagger = require('./swagger');

// ── CORS ──────────────────────────────────────────────────────
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const allowed = [
            'http://localhost:4200',
            'http://localhost:4300',   // ← ADMIN Angular dev
            'http://localhost:8100', 'https://localhost:8100',
            'http://localhost:8101', 'http://localhost:8102', 'http://localhost:8103',
            'capacitor://localhost', 'ionic://localhost',
            'http://localhost', 'https://localhost', 'file://',
            'https://nextlearn-api-v1.onrender.com',
            'https://admin-nextlearn-web.vercel.app/'
            // Ajoutez votre domaine admin prod :
            // 'https://admin.nextlearn.org',
        ];
        if (allowed.includes(origin) || origin.startsWith('file://')) return callback(null, true);
        if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) return callback(null, true);
        callback(null, true);
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'],
    allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept','Origin'],
    exposedHeaders: ['Content-Length','Content-Type','Authorization'],
};
app.use(cors(corsOptions));

// ── HTTPS redirect ────────────────────────────────────────────
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
});

// ── Logger ────────────────────────────────────────────────────
app.use((req, res, next) => {
    const start = Date.now();
    console.log(`📨 [${new Date().toISOString()}] ${req.method} ${req.path} - Origine: ${req.headers.origin||'inconnue'}`);
    res.on('finish', () => console.log(`📤 [${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${Date.now()-start}ms`));
    next();
});

// ── Body ──────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Statics ───────────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir, {
    setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));
app.use('/public', express.static(path.join(__dirname, 'public')));
setupSwagger(app);

// ── MongoDB ───────────────────────────────────────────────────
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        if (!mongoURI) { console.error('❌ MONGODB_URI non définie'); return; }
        await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 10000, socketTimeoutMS: 45000, family: 4 });
        console.log('✅ MongoDB connecté');
        mongoose.connection.on('disconnected', () => { console.log('⚠️ Déconnecté'); setTimeout(connectDB, 5000); });
        mongoose.connection.on('error', err => console.error('❌ MongoDB:', err.message));
    } catch (err) {
        console.error('❌ Connexion:', err.message);
        setTimeout(connectDB, 5000);
    }
};
connectDB();

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin',     adminRoutes);    // ← ADMIN

// ── Health ────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
    status: 'OK', timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: '1.1.0'
}));

app.get('/', (req, res) => res.json({
    message: 'API NextLearn opérationnelle', version: '1.1.0',
    endpoints: { auth: '/api/auth', documents: '/api/documents', admin: '/api/admin' }
}));

// ── Errors ────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route non trouvée', path: req.path }));
app.use((err, req, res, next) => {
    console.error('❌', err);
    if (err.name === 'ValidationError')  return res.status(400).json({ error: 'Validation', details: err.errors });
    if (err.name === 'JsonWebTokenError')return res.status(401).json({ error: 'Token invalide' });
    if (err.name === 'TokenExpiredError')return res.status(401).json({ error: 'Token expiré' });
    if (err.code === 'LIMIT_FILE_SIZE')  return res.status(400).json({ error: 'Fichier trop volumineux' });
    res.status(err.status || 500).json({ error: err.message || 'Erreur interne' });
});

// ── Init dossiers ─────────────────────────────────────────────
const fs = require('fs');
[uploadDir, path.join(uploadDir,'documents'), path.join(uploadDir,'temp')].forEach(d => {
    if (!fs.existsSync(d)) { fs.mkdirSync(d, { recursive: true }); console.log(`📁 Créé: ${d}`); }
});

module.exports = app;
