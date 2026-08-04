export interface UploadResult {
  url: string;
  publicId: string;
  resourceType: string;
  bytes: number;
}

export interface StorageService {
  uploadFile(
    file: Buffer | Express.Multer.File,
    folder: string,
    options?: any
  ): Promise<UploadResult>;
  
  deleteFile(publicId: string): Promise<void>;
  
  getSignedUrl(publicId: string, expiresIn?: number): Promise<string>;
  
  extractPdfMetadata(fileBuffer: Buffer): Promise<{ pages: number; size: number }>;
}
