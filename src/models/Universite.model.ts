import mongoose, { Schema, Document } from 'mongoose';

export interface IUniversite extends Document {
  id: string;
  nom: string;
  ville?: string;
  actif: boolean;
}

const universiteSchema = new Schema<IUniversite>(
  {
    nom: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    ville: {
      type: String,
    },
    actif: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Universite = mongoose.models.Universite || mongoose.model<IUniversite>('Universite', universiteSchema);
