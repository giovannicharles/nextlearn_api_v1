import mongoose, { Schema, Document } from 'mongoose';

export interface IDocumentRating extends Document {
  id: string;
  documentId: string;
  userId: string;
  note: number;
  createdAt: Date;
}

const documentRatingSchema = new Schema<IDocumentRating>(
  {
    documentId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    note: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

documentRatingSchema.index({ documentId: 1, userId: 1 }, { unique: true });

export const DocumentRating = mongoose.models.DocumentRating || mongoose.model<IDocumentRating>('DocumentRating', documentRatingSchema);
