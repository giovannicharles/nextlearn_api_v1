import mongoose, { Schema, Document } from 'mongoose';
import { Cycle } from '../shared/constants/academique';

export interface IFiliere extends Document {
  id: string;
  nom: string;
  actif: boolean;
  universiteId?: string;
  /** Cycle auquel appartient la filière — 2ᵉ étage de la cascade. */
  cycle?: Cycle;
  /** Niveaux réellement ouverts par cette filière (codes N1..N5). */
  niveaux?: string[];
}

const filiereSchema = new Schema<IFiliere>(
  {
    nom: {
      type: String,
      required: true,
      trim: true,
    },
    actif: {
      type: Boolean,
      default: true,
    },
    universiteId: {
      type: String,
      ref: 'Universite',
      index: true,
    },
    cycle: {
      type: String,
      enum: Object.values(Cycle),
      index: true,
    },
    niveaux: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

filiereSchema.index({ universiteId: 1, actif: 1 });

export const Filiere = mongoose.models.Filiere || mongoose.model<IFiliere>('Filiere', filiereSchema);
