import mongoose, { Schema, Document } from 'mongoose';

export interface IMatiere extends Document {
  id: string;
  nom: string;
  actif: boolean;
}

const matiereSchema = new Schema<IMatiere>(
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

export const Matiere = mongoose.models.Matiere || mongoose.model<IMatiere>('Matiere', matiereSchema);
