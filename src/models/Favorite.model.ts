import mongoose, { Schema, Document } from 'mongoose';

export interface IFavorite extends Document {
  id: string;
  userId: string;
  documentId: string;
  createdAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
  {
    userId: {
      type: String,
      required: true,
    },
    documentId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

favoriteSchema.index({ userId: 1, documentId: 1 }, { unique: true });

export const Favorite = mongoose.models.Favorite || mongoose.model<IFavorite>('Favorite', favoriteSchema);
