import mongoose, { Schema, Document } from 'mongoose';

/**
 * Dossier de vérification d'appartenance académique, pour les étudiants sans
 * adresse email institutionnelle.
 *
 * Séparé de `User` volontairement : un étudiant peut resoumettre plusieurs
 * fois, et l'historique des dossiers doit survivre à la décision.
 */
export enum VerificationStatus {
  EN_ATTENTE = 'en_attente',
  EN_REVUE = 'en_revue',
  INFOS_COMPLEMENTAIRES_REQUISES = 'infos_complementaires_requises',
  APPROUVE = 'approuve',
  REJETE = 'rejete',
}

/** Statuts depuis lesquels le dossier peut encore évoluer. */
export const OPEN_VERIFICATION_STATUSES = [
  VerificationStatus.EN_ATTENTE,
  VerificationStatus.EN_REVUE,
  VerificationStatus.INFOS_COMPLEMENTAIRES_REQUISES,
];

export interface IVerificationRequest extends Document {
  id: string;
  userId: string;
  statut: VerificationStatus;

  /** Marquage anti-fraude — un drapeau, jamais un statut : un dossier suspect
   *  continue de circuler normalement dans la file, on ne perd pas son état. */
  suspect: boolean;
  suspectRaisons: string[];

  universiteId?: string;
  filiereId?: string;
  niveau: string;
  universiteNom?: string;
  filiereNom?: string;

  nom: string;
  prenom: string;
  matricule?: string;

  justificatifType: string;
  justificatifPublicId?: string;
  justificatifHash?: string;
  justificatifBytes?: number;
  justificatifUploadedAt?: Date;
  /** Renseigné à la purge : le dossier reste, le document disparaît. */
  justificatifPurgedAt?: Date;

  assigneAId?: string;
  motifRejetCode?: string;
  motifRejetTexte?: string;
  messageComplement?: string;

  tentatives: number;
  submittedAt: Date;
  slaDueAt: Date;
  firstReviewedAt?: Date;
  decidedAt?: Date;
  escalatedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const verificationRequestSchema = new Schema<IVerificationRequest>(
  {
    userId: { type: String, ref: 'User', required: true },
    statut: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.EN_ATTENTE,
    },

    suspect: { type: Boolean, default: false },
    suspectRaisons: { type: [String], default: [] },

    universiteId: { type: String, ref: 'Universite' },
    filiereId: { type: String, ref: 'Filiere' },
    niveau: { type: String, required: true },
    universiteNom: { type: String },
    filiereNom: { type: String },

    nom: { type: String, required: true, trim: true },
    prenom: { type: String, required: true, trim: true },
    matricule: { type: String, trim: true },

    justificatifType: { type: String, required: true },
    // Stocké en Cloudinary `authenticated` : jamais accessible par URL
    // publique, uniquement via une URL signée servie aux admins-réviseurs.
    justificatifPublicId: { type: String },
    justificatifHash: { type: String },
    justificatifBytes: { type: Number },
    justificatifUploadedAt: { type: Date },
    justificatifPurgedAt: { type: Date },

    assigneAId: { type: String, ref: 'User' },
    motifRejetCode: { type: String },
    motifRejetTexte: { type: String },
    messageComplement: { type: String },

    tentatives: { type: Number, default: 1 },
    submittedAt: { type: Date, default: Date.now },
    slaDueAt: { type: Date, required: true },
    firstReviewedAt: { type: Date },
    decidedAt: { type: Date },
    escalatedAt: { type: Date },
  },
  { timestamps: true }
);

// File de traitement admin : par statut, du plus ancien au plus récent.
verificationRequestSchema.index({ statut: 1, submittedAt: 1 });
verificationRequestSchema.index({ userId: 1, createdAt: -1 });
// Détection de doublons.
verificationRequestSchema.index({ justificatifHash: 1 });
verificationRequestSchema.index({ nom: 1, prenom: 1, matricule: 1 });
// Purge des justificatifs.
verificationRequestSchema.index({ decidedAt: 1, justificatifPurgedAt: 1 });
// Détection d'escalade SLA.
verificationRequestSchema.index({ statut: 1, slaDueAt: 1, escalatedAt: 1 });

export const VerificationRequest =
  mongoose.models.VerificationRequest ||
  mongoose.model<IVerificationRequest>('VerificationRequest', verificationRequestSchema);
