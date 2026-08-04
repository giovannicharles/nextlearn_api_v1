import mongoose, { Schema, Document } from 'mongoose';

export interface IEnseignant extends Document {
  id: string;
  nom: string;
  email?: string;
  universiteId?: number;
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
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

export const Enseignant = mongoose.models.Enseignant || mongoose.model<IEnseignant>('Enseignant', enseignantSchema);
