import mongoose, { Schema, Document } from 'mongoose';

export interface IEnseignant extends Document {
  id: string;
  nom: string;
  email?: string;
  universiteId?: string;
  actif: boolean;
}

const enseignantSchema = new Schema<IEnseignant>(
  {
    nom: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
    },
    universiteId: {
      type: String,
      ref: 'Universite',
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

export const Enseignant = mongoose.models.Enseignant || mongoose.model<IEnseignant>('Enseignant', enseignantSchema);
