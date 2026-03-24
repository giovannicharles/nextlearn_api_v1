const Document = require('./document.model');
const fileStorageService = require('./file-storage.service');
const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');

class DocumentService {

    async saveDocument(documentData) {
        try {
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

    async findById(id) {
        try {
            return await Document.findById(id).lean();
        } catch (error) {
            throw new Error(`Impossible de récupérer le document: ${error.message}`);
        }
    }

    async findBySubject(subject) {
        try {
            return await Document.find({ subject, visibility: 'public' })
                .sort({ level: 1, year: -1 })
                .lean();
        } catch (error) {
            throw new Error(`Impossible de récupérer les documents: ${error.message}`);
        }
    }

    async findByLevel(level) {
        try {
            return await Document.find({ level, visibility: 'public' })
                .sort({ subject: 1, type: 1, year: -1 })
                .lean();
        } catch (error) {
            throw new Error(`Impossible de récupérer les documents par niveau: ${error.message}`);
        }
    }

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

    async storeFileAndGetUrl(file, subPath, serverBaseUrl) {
        try {
            const storagePath = await fileStorageService.storeFile(file, subPath);
            let url = `${serverBaseUrl}/uploads/${storagePath}`;
            // CORRECTION: Forcer HTTPS en production
            if (process.env.NODE_ENV === 'production') {
                url = url.replace(/^http:/, 'https:');
            }
            return url;
        } catch (error) {
            throw new Error(`Impossible de stocker le fichier: ${error.message}`);
        }
    }

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

    async getStatsByLevel() {
        return await Document.aggregate([
            { $group: { _id: '$level', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
    }
}

module.exports = new DocumentService();