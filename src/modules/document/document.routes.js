// src/modules/document/document.routes.js
const express = require('express');
const router = express.Router();
const documentController = require('./document.controller');
const fileStorageService = require('./file-storage.service');
const authMiddleware = require('../../middleware/auth.middleware');

// Configuration de multer pour l'upload
const upload = fileStorageService.getMulterConfig();

// ===== Routes publiques =====
router.get('/', documentController.getAllDocuments);
router.get('/:id', documentController.getDocumentById);
router.get('/subject/:subject', documentController.getDocumentsBySubject);
router.post('/criteria', documentController.getDocumentsForCriteria);

// ===== Routes protégées (authentification) =====
router.post('/upload', 
    authMiddleware.verifyToken,
    upload.single('file'), 
    documentController.uploadFile
);

router.post('/', 
    authMiddleware.verifyToken,
    upload.single('file'),
    documentController.createDocument
);

router.delete('/:id', 
    authMiddleware.verifyToken,
    documentController.deleteDocument
);

router.post('/extract/text', 
    authMiddleware.verifyToken,
    documentController.extractText
);

// ===== Route admin =====
router.post('/admin/fix-paths', 
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    documentController.fixPaths
);

// ===== Route téléchargement corrigée =====
// Utiliser un wildcard * pour router minimaliste
router.get('/download/', documentController.downloadFile);

module.exports = router;