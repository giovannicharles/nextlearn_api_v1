import mongoose, { Schema, Document } from 'mongoose';

export interface IOfflineDownload extends Document {
  id: string;
  userId: string;
  documentId: string;
  dateTelechargement: Date;
}

const offlineDownloadSchema = new Schema<IOfflineDownload>(
  {
    userId: {
      type: String,
      required: true,
    },
    documentId: {
      type: String,
      required: true,
      ref: 'Document',
    },
    dateTelechargement: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

offlineDownloadSchema.index({ userId: 1, documentId: 1 }, { unique: true });

export const OfflineDownload = mongoose.models.OfflineDownload || mongoose.model<IOfflineDownload>('OfflineDownload', offlineDownloadSchema);
