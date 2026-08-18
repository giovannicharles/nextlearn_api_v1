const documentService = require('./document.service');
const fileStorageService = require('./file-storage.service');
const Document = require('./document.model');
const path = require('path');

class DocumentController {

    async uploadFile(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Aucun fichier fourni' });
            }

            const subPath = req.body.subPath || 'documents';
            const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
            const serverBaseUrl = `${protocol}://${req.get('host')}`;

            const fileUrl = await documentService.storeFileAndGetUrl(
                req.file,
                subPath,
                serverBaseUrl
            );

            res.json({
                success: true,
                fileUrl,
                storagePath: req.file.path,
                filename: req.file.filename
            });
        } catch (error) {
            console.error('Erreur upload:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async createDocument(req, res) {
        try {
            console.log('📝 Création document - Body:', req.body);
            console.log('📁 Fichier reçu:', req.file ? req.file.originalname : 'AUCUN');

            const documentData = { ...req.body };

            if (!req.file) {
                return res.status(400).json({ error: 'Aucun fichier fourni' });
            }

            // CORRECTION: Forcer HTTPS en production
            const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
            const serverBaseUrl = `${protocol}://${req.get('host')}`;
            
            const fileUrl = await documentService.storeFileAndGetUrl(
                req.file,
                documentData.subPath || 'documents',
                serverBaseUrl
            );
            
            documentData.fileUrl = fileUrl;
            documentData.storagePath = req.file.path;

            if (!documentData.title || !documentData.type || !documentData.subject || !documentData.year || !documentData.level) {
                return res.status(400).json({
                    error: 'Champs obligatoires manquants: title, type, subject, year, level'
                });
            }

            const document = await documentService.saveDocument(documentData);
            res.status(201).json(document);

        } catch (error) {
            console.error('Erreur création document:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getAllDocuments(req, res) {
        try {
            const filters = {};
            if (req.query.level) filters.level = req.query.level;
            if (req.query.type) filters.type = req.query.type;
            if (req.query.subject) filters.subject = req.query.subject;

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
            if (!document) {
                return res.status(404).json({ error: 'Document non trouvé' });
            }
            res.json(document);
        } catch (error) {
            console.error('Erreur récupération document:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async deleteDocument(req, res) {
        try {
            const result = await documentService.delete(req.params.id);
            if (!result) {
                return res.status(404).json({ error: 'Document non trouvé' });
            }
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
            console.error('Erreur récupération documents par matière:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getDocumentsByLevel(req, res) {
        try {
            const documents = await documentService.findByLevel(req.params.level);
            res.json(documents);
        } catch (error) {
            console.error('Erreur récupération documents par niveau:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getDocumentsForCriteria(req, res) {
        try {
            const documents = await documentService.getDocumentsForCriteria(req.body);
            res.json(documents);
        } catch (error) {
            console.error('Erreur récupération documents par critères:', error);
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

            if (!documentIds || !documentIds.length) {
                return res.status(400).json({ error: 'Liste de documents requise' });
            }

            const documents = await Document.find({ _id: { $in: documentIds } });
            const text = await documentService.extractTextFromDocuments(documents);

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

    // async downloadFile(req, res) {
    //     try {
    //         const filePath = req.params[0];
    //         if (!filePath) {
    //             return res.status(400).json({ error: 'Chemin du fichier manquant' });
    //         }

    //         const fullPath = path.join(fileStorageService.getFileStorageLocation(), filePath);

    //         res.download(fullPath, (err) => {
    //             if (err) {
    //                 console.error('Erreur téléchargement:', err);
    //                 res.status(500).json({ error: 'Erreur lors du téléchargement' });
    //             }
    //         });
    //     } catch (error) {
    //         res.status(500).json({ error: error.message });
    //     }
    // }

    async downloadFile(req, res) {
    try {
        // Récupérer le chemin complet après /download/
        const filePath = req.params[0];
        if (!filePath) {
            return res.status(400).json({ error: 'Chemin du fichier manquant' });
        }

        // Chercher le document correspondant à ce storagePath (ou fileUrl)
        // Méthode 1 : on suppose que le front envoie l'ID du document ? Non, le front utilise l'URL directe.
        // Ici on a le chemin relatif ou l'URL Cloudinary.
        // Le plus simple : rediriger vers l'URL Cloudinary si c'en est une.
        
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            // C'est déjà une URL (Cloudinary)
            return res.redirect(filePath);
        }

        // Sinon, c'est un chemin local
        const fullPath = path.join(fileStorageService.getFileStorageLocation(), filePath);
        
        // Vérifier que le fichier existe
        await fs.access(fullPath);
        res.download(fullPath, (err) => {
            if (err) {
                console.error('Erreur téléchargement local:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Erreur lors du téléchargement' });
                }
            }
        });
    } catch (error) {
        console.error('Erreur downloadFile:', error);
        res.status(500).json({ error: error.message });
    }
}
}

module.exports = new DocumentController();