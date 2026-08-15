import mongoose, { Schema, Document } from 'mongoose';

export interface IEpreuve extends Document {
  id: string;
  matiereId: string;
  annee: number;
  universiteId?: string;
  /** Même sémantique que sur Document : optionnelle = toutes filières. */
  filiereId?: string;
  niveau: string;
  dureeMinutes: number;
  avecCorrige: boolean;
  urlPdf: string;
  urlCorrigePdf?: string;
  vues: number;
  telechargements: number;
  noteMoyenne: number;
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const epreuveSchema = new Schema<IEpreuve>(
  {
    matiereId: {
      type: String,
      ref: 'Matiere',
      required: true,
    },
    annee: {
      type: Number,
      required: true,
    },
    universiteId: {
      type: String,
      ref: 'Universite',
    },
    filiereId: {
      type: String,
      ref: 'Filiere',
    },
    niveau: {
      type: String,
      required: true,
    },
    dureeMinutes: {
      type: Number,
      required: true,
    },
    avecCorrige: {
      type: Boolean,
      default: false,
    },
    urlPdf: {
      type: String,
      required: true,
    },
    urlCorrigePdf: {
      type: String,
    },
    vues: {
      type: Number,
      default: 0,
    },
    telechargements: {
      type: Number,
      default: 0,
    },
    noteMoyenne: {
      type: Number,
      default: 0,
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

epreuveSchema.index({ matiereId: 1, annee: 1 });
epreuveSchema.index({ niveau: 1 });
epreuveSchema.index({ actif: 1, annee: -1 });
epreuveSchema.index({ universiteId: 1, niveau: 1 });

export const Epreuve = mongoose.models.Epreuve || mongoose.model<IEpreuve>('Epreuve', epreuveSchema);
