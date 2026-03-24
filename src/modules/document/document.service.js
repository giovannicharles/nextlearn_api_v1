// document.service.js
const Document = require('./document.model');
const fileStorageService = require('./file-storage.service');
const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');

class DocumentService {

    /**
     * Sauvegarder un document en base de données
     */
    async saveDocument(documentData) {
        try {
            // Parser les tags si c'est une chaîne JSON
            if (typeof documentData.tags === 'string') {
                try {
                    documentData.tags = JSON.parse(documentData.tags);
                } catch {
                    documentData.tags = documentData.tags.split(',').map(t => t.trim()).filter(Boolean);
                }
            }

            const document = new Document(documentData);
            return await document.save();
        } catch (error) {
            throw new Error(`Impossible de sauvegarder le document: ${error.message}`);
        }
    }

    /**
     * Récupérer tous les documents (triés par level puis subject)
     */
    async findAll(filters = {}) {
        try {
            const query = { visibility: 'public', ...filters };
            return await Document.find(query)
                .sort({ level: 1, subject: 1, year: -1, createdAt: -1 })
                .lean();
        } catch (error) {
            throw new Error(`Impossible de récupérer les documents: ${error.message}`);
        }
    }

    /**
     * Récupérer un document par ID
     */
    async findById(id) {
        try {
            return await Document.findById(id).lean();
        } catch (error) {
            throw new Error(`Impossible de récupérer le document: ${error.message}`);
        }
    }

    /**
     * Récupérer les documents par matière
     */
    async findBySubject(subject) {
        try {
            return await Document.find({ subject, visibility: 'public' })
                .sort({ level: 1, year: -1 })
                .lean();
        } catch (error) {
            throw new Error(`Impossible de récupérer les documents: ${error.message}`);
        }
    }

    /**
     * Récupérer les documents par level
     */
    async findByLevel(level) {
        try {
            return await Document.find({ level, visibility: 'public' })
                .sort({ subject: 1, type: 1, year: -1 })
                .lean();
        } catch (error) {
            throw new Error(`Impossible de récupérer les documents par niveau: ${error.message}`);
        }
    }

    /**
     * Filtrer les documents par critères
     */
    async getDocumentsForCriteria(criteria) {
        try {
            const query = { visibility: 'public' };

            if (criteria.type) query.type = criteria.type;
            if (criteria.subject) query.subject = criteria.subject;
            if (criteria.year) query.year = criteria.year;
            if (criteria.semester) query.semester = criteria.semester;
            if (criteria.level) query.level = criteria.level;

            if (criteria.search) {
                const regex = new RegExp(criteria.search, 'i');
                query.$or = [
                    { title: regex },
                    { subject: regex },
                    { description: regex },
                    { tags: regex }
                ];
            }

            return await Document.find(query)
                .sort({ level: 1, year: -1, createdAt: -1 })
                .lean();
        } catch (error) {
            throw new Error(`Impossible de filtrer les documents: ${error.message}`);
        }
    }

    /**
     * Supprimer un document
     */
    async delete(id) {
        try {
            const doc = await Document.findByIdAndDelete(id);
            if (doc && doc.storagePath) {
                await fileStorageService.deleteFile(doc.storagePath).catch(console.error);
            }
            return doc;
        } catch (error) {
            throw new Error(`Impossible de supprimer le document: ${error.message}`);
        }
    }

    /**
     * Stocker un fichier et retourner l'URL
     */
    async storeFileAndGetUrl(file, subPath, serverBaseUrl) {
        try {
            const storagePath = await fileStorageService.storeFile(file, subPath);
            return `${serverBaseUrl}/uploads/${storagePath}`;
        } catch (error) {
            throw new Error(`Impossible de stocker le fichier: ${error.message}`);
        }
    }

    /**
     * Extraire le texte d'un ensemble de documents
     */
    async extractTextFromDocuments(documents) {
        const texts = [];

        for (const doc of documents) {
            try {
                if (doc.storagePath) {
                    const fullPath = path.join(fileStorageService.getFileStorageLocation(), doc.storagePath);
                    const buffer = await fs.readFile(fullPath);
                    const pdfData = await pdfParse(buffer);
                    texts.push(`--- ${doc.title} (${doc.subject}, ${doc.level}) ---\n${pdfData.text}`);
                }
            } catch (e) {
                console.error(`Erreur extraction texte pour ${doc._id}:`, e.message);
            }
        }

        return texts.join('\n\n');
    }

    /**
     * Corriger les chemins des anciens documents
     */
    async fixDocumentPaths() {
        const docs = await Document.find({ storagePath: { $exists: true } });
        const updates = [];

        for (const doc of docs) {
            if (doc.storagePath && doc.storagePath.includes('\\')) {
                doc.storagePath = doc.storagePath.replace(/\\/g, '/');
                await doc.save();
                updates.push(doc._id);
            }
        }

        return updates;
    }

    /**
     * Statistiques groupées par level
     */
    async getStatsByLevel() {
        return await Document.aggregate([
            { $group: { _id: '$level', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
    }
}

module.exports = new DocumentService();