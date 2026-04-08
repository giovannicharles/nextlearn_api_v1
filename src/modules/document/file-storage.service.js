const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configuration Cloudinary (si les variables sont définies)
if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log('☁️ Cloudinary configuré');
}

class FileStorageService {
    constructor() {
        this.uploadDir = process.env.UPLOAD_DIR || 'uploads';
        this.fileStorageLocation = path.resolve(this.uploadDir);
        // Détecter si on utilise Cloudinary (production avec variables définies)
        this.useCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.NODE_ENV === 'production');
        this.init();
    }

    async init() {
        try {
            // Toujours créer le dossier local pour le développement
            await fs.mkdir(this.fileStorageLocation, { recursive: true });
            console.log(`✅ Répertoire de stockage local: ${this.fileStorageLocation}`);

            await fs.access(this.fileStorageLocation, fs.constants.W_OK);
            console.log('✅ Permissions d\'écriture OK');
            
            await fs.access(this.fileStorageLocation, fs.constants.R_OK);
            console.log('✅ Permissions de lecture OK');
            
            if (this.useCloudinary) {
                console.log('☁️ Cloudinary activé pour la production');
            } else {
                console.log('📁 Utilisation du stockage local');
            }
        } catch (error) {
            console.error('❌ Erreur initialisation stockage:', error);
            throw new Error(`Impossible d'initialiser le répertoire de stockage: ${error.message}`);
        }
    }

    getFileStorageLocation() {
        return this.fileStorageLocation;
    }

    // Configuration de multer pour l'upload
    getMulterConfig() {
        // Si Cloudinary est activé, utiliser son stockage
        if (this.useCloudinary) {
            const storage = new CloudinaryStorage({
                cloudinary: cloudinary,
                params: async (req, file) => {
                    const subPath = req.body.subPath || 'documents';
                    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
                    const extension = path.extname(file.originalname).substring(1);
                    
                    // Déterminer le resource_type en fonction du fichier
                    // CORRECTION : pour les PDF, utiliser 'auto' (ou 'image') au lieu de 'raw'
                    // Cela permet à Cloudinary de servir le PDF avec le bon Content-Type et affichage inline
                    let resourceType = 'auto';
                    if (file.mimetype.includes('image')) resourceType = 'image';
                    
                    return {
                        folder: `nextlearn/${subPath}`,
                        public_id: uniqueSuffix,
                        format: extension,
                        resource_type: resourceType,
                        allowed_formats: ['pdf', 'docx', 'txt', 'doc', 'odt', 'jpg', 'png']
                    };
                }
            });
            
            return multer({ storage });
        }
        
        // Sinon, stockage local (développement)
        const storage = multer.diskStorage({
            destination: async (req, file, cb) => {
                try {
                    const subPath = req.body.subPath || 'documents';
                    const uploadPath = path.join(this.fileStorageLocation, subPath);
                    await fs.mkdir(uploadPath, { recursive: true });
                    console.log(`📁 Destination upload locale: ${uploadPath}`);
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
            
            // Si Cloudinary est utilisé et que file.path est une URL Cloudinary
            if (this.useCloudinary && file.path) {
                // Cloudinary retourne déjà l'URL complète
                console.log(`☁️ Fichier stocké sur Cloudinary: ${file.path}`);
                return file.path;
            }
            
            // Stockage local
            const relativePath = path.relative(this.fileStorageLocation, file.path);
            return relativePath.replace(/\\/g, '/');
        } catch (error) {
            throw new Error(`Impossible de stocker le fichier: ${error.message}`);
        }
    }

    async getFileStream(filePath) {
        try {
            // Si c'est une URL Cloudinary, télécharger via fetch
            if (this.useCloudinary && (filePath.startsWith('http://') || filePath.startsWith('https://'))) {
                const response = await fetch(filePath);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const buffer = await response.arrayBuffer();
                return Buffer.from(buffer);
            }
            
            // Stockage local
            const fullPath = path.join(this.fileStorageLocation, filePath);
            await fs.access(fullPath, fs.constants.R_OK);
            return await fs.readFile(fullPath);
        } catch (error) {
            throw new Error(`Fichier non trouvé ou inaccessible: ${error.message}`);
        }
    }

    async deleteFile(filePath) {
        try {
            // Si c'est une URL Cloudinary, supprimer via l'API
            if (this.useCloudinary && (filePath.startsWith('http://') || filePath.startsWith('https://'))) {
                // Extraction robuste du public_id et du resource_type depuis l'URL Cloudinary
                try {
                    const url = new URL(filePath);
                    const pathParts = url.pathname.split('/');
                    // Exemple d'URL : /v1234567/nextlearn/documents/maths/abc123.pdf
                    const uploadIndex = pathParts.findIndex(p => p === 'upload');
                    if (uploadIndex !== -1 && pathParts.length > uploadIndex + 2) {
                        const resourceType = pathParts[uploadIndex + 1]; // 'auto', 'image', 'raw', etc.
                        const publicIdWithExt = pathParts.slice(uploadIndex + 2).join('/');
                        const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ''); // enlever l'extension
                        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
                        if (result.result === 'ok') {
                            console.log(`✅ Fichier Cloudinary supprimé: ${publicId} (type: ${resourceType})`);
                            return true;
                        } else {
                            console.warn(`⚠️ Échec suppression Cloudinary: ${result.result}`);
                        }
                    } else {
                        console.error('❌ Impossible d\'extraire le public_id de l\'URL:', filePath);
                    }
                } catch (parseError) {
                    console.error('Erreur parsing URL Cloudinary:', parseError);
                }
                return false;
            }
            
            // Stockage local
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