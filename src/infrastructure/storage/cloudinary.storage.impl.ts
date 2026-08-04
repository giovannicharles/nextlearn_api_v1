import { v2 as cloudinary } from 'cloudinary';
import { StorageService, UploadResult } from './storage.interface';
import * as pdfParseModule from 'pdf-parse';
import env from '../../config/env';

const pdfParse: any = (pdfParseModule as any).default || pdfParseModule;

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export class CloudinaryStorageService implements StorageService {
  async uploadFile(
    file: Buffer | Express.Multer.File,
    folder: string = 'nextlearn/documents',
    options: any = {}
  ): Promise<UploadResult> {
    try {
      const buffer = file instanceof Buffer ? file : file.buffer;
      
      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
            ...options,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        bytes: result.bytes,
      };
    } catch (error) {
      throw new Error(`Cloudinary upload failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error(`Failed to delete file ${publicId}:`, error instanceof Error ? error.message : error);
    }
  }

  async getSignedUrl(publicId: string, expiresIn: number = 3600): Promise<string> {
    try {
      const url = cloudinary.url(publicId, {
        sign_url: true,
        type: 'authenticated',
        expires_at: Math.floor(Date.now() / 1000) + expiresIn,
      });
      return url;
    } catch (error) {
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : error}`);
    }
  }

  async extractPdfMetadata(fileBuffer: Buffer): Promise<{ pages: number; size: number }> {
    try {
      const data = await pdfParse(fileBuffer);
      return {
        pages: data.numpages,
        size: fileBuffer.length,
      };
    } catch (error) {
      throw new Error(`Failed to extract PDF metadata: ${error instanceof Error ? error.message : error}`);
    }
  }
}
