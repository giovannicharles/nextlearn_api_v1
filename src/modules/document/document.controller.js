// src/modules/document/document.controller.js
const documentService    = require('./document.service');
const fileStorageService = require('./file-storage.service');
const Document           = require('./document.model');
const path               = require('path');
const fs                 = require('fs').promises;

class DocumentController {

    async uploadFile(req, res) {
        try {
            if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });

            const subPath       = req.body.subPath || 'documents';
            const serverBaseUrl = this._getBaseUrl(req);
            const fileUrl       = await documentService.storeFileAndGetUrl(req.file, subPath, serverBaseUrl);

            res.json({ success: true, fileUrl, storagePath: req.file.path, filename: req.file.filename });
        } catch (error) {
            console.error('Erreur upload:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async createDocument(req, res) {
        try {
            console.log('📝 Création document:', req.body);
            if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });

            const documentData  = { ...req.body };
            const serverBaseUrl = this._getBaseUrl(req);

            documentData.fileUrl     = await documentService.storeFileAndGetUrl(req.file, documentData.subPath || 'documents', serverBaseUrl);
            documentData.storagePath = req.file.path;

            if (!documentData.title || !documentData.type || !documentData.subject || !documentData.year || !documentData.level) {
                return res.status(400).json({ error: 'Champs obligatoires manquants: title, type, subject, year, level' });
            }

            const document = await documentService.saveDocument(documentData);
            res.status(201).json(document);
        } catch (error) {
            console.error('Erreur création document:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // ── Mise à jour d'un document (admin) ─────────────────────
    async updateDocument(req, res) {
        try {
            const { id }   = req.params;
            const existing = await documentService.findById(id);

            if (!existing) return res.status(404).json({ error: 'Document non trouvé' });

            const updateData = { ...req.body };

            // Si un nouveau fichier est fourni, remplacer l'ancien
            if (req.file) {
                const serverBaseUrl = this._getBaseUrl(req);
                updateData.fileUrl     = await documentService.storeFileAndGetUrl(req.file, updateData.subPath || 'documents', serverBaseUrl);
                updateData.storagePath = req.file.path;

                // Supprimer l'ancien fichier (non bloquant)
                if (existing.storagePath) {
                    fileStorageService.deleteFile(existing.storagePath).catch(e =>
                        console.warn('⚠️ Ancien fichier non supprimé:', e.message)
                    );
                }
            }

            // Parser les tags si c'est une string JSON
            if (typeof updateData.tags === 'string') {
                try { updateData.tags = JSON.parse(updateData.tags); }
                catch { updateData.tags = updateData.tags.split(',').map(t => t.trim()).filter(Boolean); }
            }

            // Champs autorisés uniquement
            const allowed = ['title', 'type', 'level', 'subject', 'year', 'semester', 'author', 'description', 'tags', 'fileUrl', 'storagePath', 'visibility'];
            const filtered = {};
            allowed.forEach(k => { if (updateData[k] !== undefined) filtered[k] = updateData[k]; });

            const updated = await Document.findByIdAndUpdate(id, filtered, { new: true, runValidators: true });
            res.json(updated);

        } catch (error) {
            console.error('Erreur mise à jour document:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getAllDocuments(req, res) {
        try {
            const filters = {};
            if (req.query.level)   filters.level   = req.query.level;
            if (req.query.type)    filters.type     = req.query.type;
            if (req.query.subject) filters.subject  = req.query.subject;
            const documents = await documentService.findAll(filters);
            res.json(documents);
        } catch (error) {
            console.error('Erreur récupération documents:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getDocumentById(req, res) {
        try {
            const document = await documentService.findById(req.params.id);
            if (!document) return res.status(404).json({ error: 'Document non trouvé' });
            res.json(document);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async deleteDocument(req, res) {
        try {
            const result = await documentService.delete(req.params.id);
            if (!result) return res.status(404).json({ error: 'Document non trouvé' });
            res.json({ message: 'Document supprimé avec succès' });
        } catch (error) {
            console.error('Erreur suppression document:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getDocumentsBySubject(req, res) {
        try {
            const documents = await documentService.findBySubject(req.params.subject);
            res.json(documents);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getDocumentsByLevel(req, res) {
        try {
            const documents = await documentService.findByLevel(req.params.level);
            res.json(documents);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getDocumentsForCriteria(req, res) {
        try {
            const documents = await documentService.getDocumentsForCriteria(req.body);
            res.json(documents);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getStatsByLevel(req, res) {
        try {
            const stats = await documentService.getStatsByLevel();
            res.json(stats);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async extractText(req, res) {
        try {
            const { documentIds } = req.body;
            if (!documentIds?.length) return res.status(400).json({ error: 'Liste de documents requise' });
            const documents = await Document.find({ _id: { $in: documentIds } });
            const text      = await documentService.extractTextFromDocuments(documents);
            res.json({ text });
        } catch (error) {
            console.error('Erreur extraction texte:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async fixPaths(req, res) {
        try {
            const updates = await documentService.fixDocumentPaths();
            res.json({ message: 'Correction des chemins terminée', updates });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async downloadFile(req, res) {
        try {
            // req.params[0] contient tout ce qui suit /download/
            const filePath = req.params[0];
            if (!filePath) return res.status(400).json({ error: 'Chemin manquant' });

            // URL Cloudinary → redirection directe
            if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
                return res.redirect(filePath);
            }

            const fullPath = path.join(fileStorageService.getFileStorageLocation(), filePath);
            await fs.access(fullPath);

            res.download(fullPath, (err) => {
                if (err && !res.headersSent) {
                    console.error('Erreur téléchargement:', err);
                    res.status(500).json({ error: 'Erreur lors du téléchargement' });
                }
            });
        } catch (error) {
            console.error('Erreur downloadFile:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // ── Helper ────────────────────────────────────────────────
    _getBaseUrl(req) {
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
        return `${protocol}://${req.get('host')}`;
    }
}

module.exports = new DocumentController();