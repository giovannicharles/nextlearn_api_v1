// document.routes.js
const express = require('express');
const router = express.Router();
const documentController = require('./document.controller');
const fileStorageService = require('./file-storage.service');
const authMiddleware = require('../../middleware/auth.middleware');

const upload = fileStorageService.getMulterConfig();

console.log('✅ Document routes chargées');

// ===== ROUTES PUBLIQUES =====
router.get('/', documentController.getAllDocuments.bind(documentController));
router.get('/stats/level', documentController.getStatsByLevel.bind(documentController));
router.get('/subject/:subject', documentController.getDocumentsBySubject.bind(documentController));
router.get('/level/:level', documentController.getDocumentsByLevel.bind(documentController));
router.get('/:id', documentController.getDocumentById.bind(documentController));

// ===== ROUTES PROTÉGÉES (filtre par critères) =====
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

router.delete('/:id',
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    documentController.deleteDocument.bind(documentController)
);

// ===== ROUTE DOWNLOAD =====
router.get('/download/',
    authMiddleware.verifyToken,
    documentController.downloadFile.bind(documentController)
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

module.exports = router;