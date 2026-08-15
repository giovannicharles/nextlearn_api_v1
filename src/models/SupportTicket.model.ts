import mongoose, { Schema, Document } from 'mongoose';

export enum SupportTicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
}

export enum SupportTicketCategory {
  CONNEXION = 'CONNEXION',
  DOCUMENT = 'DOCUMENT',
  COMPTE = 'COMPTE',
  BUG = 'BUG',
  AUTRE = 'AUTRE',
}

export interface ISupportTicket extends Document {
  id: string;
  userId: string;
  categorie: SupportTicketCategory;
  sujet: string;
  message: string;
  status: SupportTicketStatus;
  reponseAdmin?: string;
  traiteParId?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
    },
    categorie: {
      type: String,
      enum: Object.values(SupportTicketCategory),
      default: SupportTicketCategory.AUTRE,
    },
    sujet: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(SupportTicketStatus),
      default: SupportTicketStatus.OPEN,
    },
    reponseAdmin: {
      type: String,
    },
    traiteParId: {
      type: String,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// File de traitement : les tickets ouverts en premier, du plus ancien au plus récent.
supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.index({ userId: 1, createdAt: -1 });

export const SupportTicket =
  mongoose.models.SupportTicket ||
  mongoose.model<ISupportTicket>('SupportTicket', supportTicketSchema);
