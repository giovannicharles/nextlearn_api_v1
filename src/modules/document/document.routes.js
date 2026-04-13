// src/modules/document/document.routes.js
const express        = require('express');
const router         = express.Router();
const documentController = require('./document.controller');
const fileStorageService = require('./file-storage.service');
const authMiddleware     = require('../../middleware/auth.middleware');

const upload = fileStorageService.getMulterConfig();

console.log('✅ Document routes chargées');

// ===== ROUTES PUBLIQUES =====
router.get('/',                documentController.getAllDocuments.bind(documentController));
router.get('/stats/level',     documentController.getStatsByLevel.bind(documentController));
router.get('/subject/:subject', documentController.getDocumentsBySubject.bind(documentController));
router.get('/level/:level',    documentController.getDocumentsByLevel.bind(documentController));

// ===== ROUTES PROTÉGÉES =====
router.post('/criteria',
    authMiddleware.verifyToken,
    documentController.getDocumentsForCriteria.bind(documentController)
);

// ===== ROUTES ADMIN =====
router.post('/',
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    upload.single('file'),
    documentController.createDocument.bind(documentController)
);

router.post('/upload',
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    upload.single('file'),
    documentController.uploadFile.bind(documentController)
);

// ── IMPORTANT : PUT avec upload optionnel (pour modifier sans changer le fichier)
router.put('/:id',
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    upload.single('file'),   // file est optionnel lors d'un PUT
    documentController.updateDocument.bind(documentController)
);

router.delete('/:id',
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    documentController.deleteDocument.bind(documentController)
);

// ===== ROUTES UTILITAIRES =====
router.post('/extract-text',
    authMiddleware.verifyToken,
    documentController.extractText.bind(documentController)
);

router.post('/fix-paths',
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    documentController.fixPaths.bind(documentController)
);

// ===== ROUTE DOWNLOAD (wildcard — doit être EN DERNIER) =====
// CORRECTION : utiliser /* au lieu de / pour capturer le chemin complet
router.get('/download/',
    authMiddleware.verifyToken,
    documentController.downloadFile.bind(documentController)
);

// ===== GET PAR ID (après tous les autres GET spécifiques) =====
router.get('/:id', documentController.getDocumentById.bind(documentController));

module.exports = router;