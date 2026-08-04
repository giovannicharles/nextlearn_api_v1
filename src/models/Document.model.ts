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
  matiereId: number;
  enseignantId?: number;
  universiteId?: number;
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
      type: Number,
      required: true,
    },
    enseignantId: {
      type: Number,
    },
    universiteId: {
      type: Number,
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
