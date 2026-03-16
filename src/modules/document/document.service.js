const Document = require('./document.model');
const fileStorageService = require('./file-storage.service');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');

class DocumentService {
    
    async storeFileAndGetUrl(file, subPath, serverBaseUrl) {
        const relativePath = await fileStorageService.storeFile(file, subPath);
        const baseUrl = serverBaseUrl.endsWith('/') ? serverBaseUrl : `${serverBaseUrl}/`;
        return `${baseUrl}uploads/${relativePath}`;
    }

    async saveDocument(docData) {
        const document = new Document({
            ...docData,
            createdAt: new Date()
        });
        return await document.save();
    }

    async findAll() {
        return await Document.find().sort({ createdAt: -1 });
    }

    async findById(id) {
        return await Document.findById(id);
    }

    async delete(id) {
        const doc = await Document.findById(id);
        if (doc && doc.storagePath) {
            await fileStorageService.deleteFile(doc.storagePath);
        }
        return await Document.findByIdAndDelete(id);
    }

    async findBySubject(subject) {
        return await Document.find({ subject }).sort({ createdAt: -1 });
    }

    async getDocumentsForCriteria(criteria) {
        const semesterStr = `S${criteria.semester}`;
        const query = {
            subject: criteria.subject,
            semester: semesterStr
        };

        if (criteria.type && criteria.type.trim()) {
            query.type = criteria.type;
            return await Document.find(query).sort({ createdAt: -1 });
        } else {
            return await Document.find(query).sort({ createdAt: -1 });
        }
    }

    async extractTextFromDocuments(docs) {
        let result = '';
        
        for (const doc of docs) {
            result += `=== Document: ${doc.title} ===\n`;
            result += `Matière: ${doc.subject}\n`;
            result += `Type: ${doc.type}\n`;
            result += `Semestre: ${doc.semester}\n`;
            result += `Description: ${doc.description || ''}\n`;

            try {
                const content = await this.extractContentFromDocument(doc);
                result += `Contenu:\n${content}\n`;
            } catch (error) {
                result += `Erreur lors de l'extraction du contenu: ${error.message}\n`;
                console.error(`Erreur d'extraction pour le document ${doc._id}:`, error);
            }
            
            result += '\n---\n';
        }
        
        return result;
    }

    async extractContentFromDocument(doc) {
        let fileBuffer = null;
        let fileExtension = null;

        try {
            // Récupérer le fichier
            if (doc.storagePath) {
                fileBuffer = await fileStorageService.getFileStream(doc.storagePath);
                fileExtension = path.extname(doc.storagePath).toLowerCase().replace('.', '');
            } else if (doc.fileUrl) {
                // Télécharger depuis l'URL
                const response = await fetch(doc.fileUrl);
                if (!response.ok) {
                    throw new Error(`Impossible de télécharger le fichier: ${response.statusText}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                fileBuffer = Buffer.from(arrayBuffer);
                
                // Essayer de détecter l'extension depuis l'URL
                const urlPath = new URL(doc.fileUrl).pathname;
                fileExtension = path.extname(urlPath).toLowerCase().replace('.', '');
            } else {
                return "Aucun fichier associé à ce document";
            }

            // Si pas d'extension, essayer de détecter
            if (!fileExtension) {
                fileExtension = await this.detectFileTypeFromContent(fileBuffer);
            }

            if (!fileExtension) {
                return "Format de fichier non supporté (extension manquante)";
            }

            // Extraire le texte selon l'extension
            let content = await this.extractTextBasedOnExtension(fileBuffer, fileExtension);
            
            // Tronquer si trop long
            if (content.length > 10000) {
                content = content.substring(0, 10000) + '\n... [texte tronqué]';
            }
            
            return content;
        } catch (error) {
            if (error.code === 'EACCES') {
                return "Accès refusé au fichier. Vérifiez les permissions.";
            }
            throw error;
        }
    }

    async detectFileTypeFromContent(buffer) {
        // Signature PDF: %PDF
        if (buffer.length >= 5 && buffer.toString('utf8', 0, 5) === '%PDF-') {
            return 'pdf';
        }
        
        // Signature DOCX/ZIP: PK
        if (buffer.length >= 4 && buffer.toString('utf8', 0, 4) === 'PK\x03\x04') {
            return 'docx';
        }
        
        // Vérifier si c'est du texte
        const sample = buffer.toString('utf8', 0, Math.min(1000, buffer.length));
        if (/^[\x00-\x7F\n\r\t ]+$/.test(sample)) {
            return 'txt';
        }
        
        return null;
    }

    async extractTextBasedOnExtension(buffer, extension) {
        switch (extension.toLowerCase()) {
            case 'pdf':
                return await this.extractTextFromPdf(buffer);
            case 'docx':
                return await this.extractTextFromDocx(buffer);
            case 'txt':
                return buffer.toString('utf8');
            default:
                return `Format de fichier non supporté: ${extension}`;
        }
    }

    async extractTextFromPdf(buffer) {
        try {
            const data = await pdf(buffer);
            return data.text;
        } catch (error) {
            throw new Error(`Erreur extraction PDF: ${error.message}`);
        }
    }

    async extractTextFromDocx(buffer) {
        try {
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        } catch (error) {
            throw new Error(`Erreur extraction DOCX: ${error.message}`);
        }
    }

    async fixDocumentPaths() {
        const documents = await this.findAll();
        const updates = [];

        for (const doc of documents) {
            if (doc.storagePath) {
                const fullPath = path.join(fileStorageService.getFileStorageLocation(), doc.storagePath);
                
                try {
                    const stats = await fs.stat(fullPath);
                    
                    if (stats.isDirectory()) {
                        // Chercher le premier fichier dans le répertoire
                        const files = await fs.readdir(fullPath);
                        const validFile = files.find(f => {
                            const ext = path.extname(f).toLowerCase();
                            return ['.pdf', '.docx', '.txt'].includes(ext);
                        });

                        if (validFile) {
                            const newStoragePath = path.join(doc.storagePath, validFile).replace(/\\/g, '/');
                            doc.storagePath = newStoragePath;
                            
                            // Mettre à jour l'URL
                            const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
                            doc.fileUrl = `${baseUrl}/uploads/${newStoragePath}`;
                            
                            await doc.save();
                            updates.push({ id: doc._id, newPath: newStoragePath });
                            console.log(`✅ Document ${doc._id} mis à jour: ${newStoragePath}`);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Erreur pour document ${doc._id}:`, error.message);
                }
            }
        }
        
        return updates;
    }
}

module.exports = new DocumentService();