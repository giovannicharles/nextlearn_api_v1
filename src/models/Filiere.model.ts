import mongoose, { Schema, Document } from 'mongoose';

export interface IFiliere extends Document {
  id: string;
  nom: string;
  actif: boolean;
}

const filiereSchema = new Schema<IFiliere>(
  {
    nom: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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

export const Filiere = mongoose.models.Filiere || mongoose.model<IFiliere>('Filiere', filiereSchema);
