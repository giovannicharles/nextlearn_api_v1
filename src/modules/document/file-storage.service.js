const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

class FileStorageService {
    constructor() {
        this.uploadDir = process.env.UPLOAD_DIR || 'uploads';
        this.fileStorageLocation = path.resolve(this.uploadDir);
        this.init();
    }

    async init() {
        try {
            await fs.mkdir(this.fileStorageLocation, { recursive: true });
            console.log(`✅ Répertoire de stockage: ${this.fileStorageLocation}`);

            await fs.access(this.fileStorageLocation, fs.constants.W_OK);
            console.log('✅ Permissions d\'écriture OK');
            
            await fs.access(this.fileStorageLocation, fs.constants.R_OK);
            console.log('✅ Permissions de lecture OK');
        } catch (error) {
            console.error('❌ Erreur initialisation stockage:', error);
            throw new Error(`Impossible d'initialiser le répertoire de stockage: ${error.message}`);
        }
    }

    getFileStorageLocation() {
        return this.fileStorageLocation;
    }

    // Configuration de multer pour l'upload (inspirée de course-imports)
    getMulterConfig() {
        // Utiliser diskStorage comme avant
        const storage = multer.diskStorage({
            destination: async (req, file, cb) => {
                try {
                    const subPath = req.body.subPath || 'documents';
                    const uploadPath = path.join(this.fileStorageLocation, subPath);
                    await fs.mkdir(uploadPath, { recursive: true });
                    console.log(`📁 Destination upload: ${uploadPath}`);
                    cb(null, uploadPath);
                } catch (error) {
                    console.error('❌ Erreur destination:', error);
                    cb(error, null);
                }
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = crypto.randomBytes(16).toString('hex');
                const extension = path.extname(file.originalname);
                const filename = `${uniqueSuffix}${extension}`;
                console.log(`📁 Nom fichier généré: ${filename}`);
                cb(null, filename);
            }
        });

        const fileFilter = (req, file, cb) => {
            console.log(`🔍 Fichier reçu: ${file.originalname} (${file.mimetype})`);
            
            const allowedTypes = [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'application/msword',
                'application/vnd.oasis.opendocument.text'
            ];

            if (allowedTypes.includes(file.mimetype)) {
                console.log('✅ Type accepté');
                cb(null, true);
            } else {
                console.log('❌ Type refusé');
                cb(new Error('Type de fichier non supporté. Seuls PDF, DOCX et TXT sont acceptés.'), false);
            }
        };

        const limits = {
            fileSize: 50 * 1024 * 1024 // 50MB max
        };

        return multer({ storage, fileFilter, limits });
    }

    async storeFile(file, subPath) {
        try {
            if (!file) throw new Error('Aucun fichier fourni');
            const relativePath = path.relative(this.fileStorageLocation, file.path);
            return relativePath.replace(/\\/g, '/');
        } catch (error) {
            throw new Error(`Impossible de stocker le fichier: ${error.message}`);
        }
    }

    async getFileStream(filePath) {
        try {
            const fullPath = path.join(this.fileStorageLocation, filePath);
            await fs.access(fullPath, fs.constants.R_OK);
            return await fs.readFile(fullPath);
        } catch (error) {
            throw new Error(`Fichier non trouvé ou inaccessible: ${error.message}`);
        }
    }

    async deleteFile(filePath) {
        try {
            const fullPath = path.join(this.fileStorageLocation, filePath);
            await fs.unlink(fullPath);
            return true;
        } catch (error) {
            console.error(`Erreur suppression fichier ${filePath}:`, error);
            return false;
        }
    }
}

module.exports = new FileStorageService();