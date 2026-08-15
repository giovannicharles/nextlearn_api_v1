import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export enum DocumentType {
  COURS = 'COURS',
  TD = 'TD',
  SYNTHESE = 'SYNTHESE',
}

export interface IDocument extends MongooseDocument {
  id: string;
  titre: string;
  description: string;
  type: DocumentType;
  matiereId: string;
  enseignantId?: string;
  universiteId?: string;
  /**
   * Filière visée. Optionnelle : un document sans filière est générique et
   * concerne toutes les filières du niveau (même règle que universiteId).
   * La filière ne peut pas être déduite de la matière — une matière comme
   * « Mathématiques » ou « Anglais » est partagée entre plusieurs filières.
   */
  filiereId?: string;
  niveau: string;
  anneeAcademique: string;
  tailleMb: number;
  pages: number;
  urlPdf: string;
  thumbnailUrl?: string;
  dateAjout: Date;
  vues: number;
  telechargements: number;
  noteMoyenne: number;
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    titre: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(DocumentType),
    },
    matiereId: {
      type: String,
      ref: 'Matiere',
      required: true,
    },
    enseignantId: {
      type: String,
      ref: 'Enseignant',
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
    anneeAcademique: {
      type: String,
      required: true,
    },
    tailleMb: {
      type: Number,
      required: true,
    },
    pages: {
      type: Number,
      required: true,
    },
    urlPdf: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
    },
    dateAjout: {
      type: Date,
      default: Date.now,
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

documentSchema.index({ matiereId: 1, niveau: 1 });
documentSchema.index({ type: 1 });
documentSchema.index({ dateAjout: -1 });
documentSchema.index({ telechargements: -1 });
documentSchema.index({ actif: 1, dateAjout: -1 });
documentSchema.index({ titre: 'text', description: 'text' });

export const Document = mongoose.models.Document || mongoose.model<IDocument>('Document', documentSchema);
