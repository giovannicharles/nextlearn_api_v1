import mongoose, { Schema, Document } from 'mongoose';

/**
 * Journal des décisions sur les dossiers de vérification.
 *
 * Collection distincte du dossier : le justificatif est purgé au bout de 30
 * jours, **le journal ne l'est pas**. Il doit rester possible de justifier a
 * posteriori qui a approuvé quoi, quand et pourquoi.
 */
export interface IVerificationAuditLog extends Document {
  id: string;
  requestId: string;
  userId: string;
  adminId?: string;
  action: string;
  ancienStatut?: string;
  nouveauStatut?: string;
  motif?: string;
  ip?: string;
  createdAt: Date;
}

const verificationAuditLogSchema = new Schema<IVerificationAuditLog>(
  {
    requestId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    adminId: { type: String },
    action: { type: String, required: true },
    ancienStatut: { type: String },
    nouveauStatut: { type: String },
    motif: { type: String },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

verificationAuditLogSchema.index({ createdAt: -1 });

export const VerificationAuditLog =
  mongoose.models.VerificationAuditLog ||
  mongoose.model<IVerificationAuditLog>('VerificationAuditLog', verificationAuditLogSchema);
