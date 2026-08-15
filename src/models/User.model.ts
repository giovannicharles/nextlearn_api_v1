import mongoose, { Schema, Document } from 'mongoose';

// Les niveaux et les cycles vivent désormais dans le référentiel partagé :
// un niveau seul est ambigu, c'est le couple (cycle, niveau) qui identifie
// une promotion. Réexporté ici pour ne casser aucun import existant.
export { NiveauEtude, Cycle } from '../shared/constants/academique';
import { NiveauEtude, Cycle } from '../shared/constants/academique';

export enum Langue {
  FR = 'FR',
  EN = 'EN',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export interface IUser extends Document {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  universite: string;
  filiere: string;
  /**
   * Références résolues vers les collections Universite / Filiere.
   * `universite` et `filiere` restent les noms affichés (contrat d'API
   * inchangé) ; ces deux id servent au ciblage des notifications, qui ne peut
   * pas se faire sur des chaînes libres. Optionnels : un compte créé avant la
   * résolution, ou dont le nom ne correspond à aucune référence, reste valide.
   */
  universiteId?: string;
  filiereId?: string;
  /** Cycle suivi (ingénieur, licence, master…). Désambiguïse le niveau. */
  cycle?: Cycle;
  niveau: NiveauEtude;
  langue: Langue;
  role: string;
  status: UserStatus;
  permissions: string[];
  pinHash?: string;
  avatarUrl?: string;
  fcmToken?: string;
  isEmailVerified: boolean;
  isPremium: boolean;
  lastLoginAt?: Date;
  suspendedReason?: string;
  suspendedUntil?: Date;
  /**
   * Verrouillage après PIN erronés répétés. Aucun compteur n'existait : un
   * compte ne pouvait donc jamais être « bloqué », et l'administrateur n'avait
   * aucun moyen de repérer un étudiant en difficulté de connexion.
   */
  failedPinAttempts: number;
  lockedUntil?: Date;
  lastFailedLoginAt?: Date;
  /**
   * Statut du dossier de vérification académique, pour les comptes inscrits
   * sans adresse email institutionnelle. `'requis'` = justificatif pas encore
   * déposé. Les autres valeurs suivent l'énumération VerificationStatus du
   * module verification (en_attente/en_revue/infos_complementaires_requises/
   * approuve/rejete). Absent = compte standard, jamais concerné.
   */
  verificationStatus?: string;
  verificationRequestId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    nom: {
      type: String,
      required: true,
      trim: true,
    },
    prenom: {
      type: String,
      required: true,
      trim: true,
    },
    universite: {
      type: String,
      required: true,
      trim: true,
    },
    filiere: {
      type: String,
      required: true,
      trim: true,
    },
    universiteId: {
      type: String,
      ref: 'Universite',
    },
    filiereId: {
      type: String,
      ref: 'Filiere',
    },
    cycle: {
      type: String,
      enum: Object.values(Cycle),
    },
    niveau: {
      type: String,
      required: true,
      enum: Object.values(NiveauEtude),
    },
    langue: {
      type: String,
      enum: Object.values(Langue),
      default: Langue.FR,
    },
    role: {
      type: String,
      default: 'user',
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    suspendedReason: {
      type: String,
    },
    suspendedUntil: {
      type: Date,
    },
    failedPinAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
    },
    lastFailedLoginAt: {
      type: Date,
    },
    verificationStatus: {
      type: String,
      index: true,
    },
    verificationRequestId: {
      type: String,
    },
    pinHash: {
      type: String,
      select: false,
    },
    avatarUrl: {
      type: String,
    },
    fcmToken: {
      type: String,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.pinHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Ciblage des notifications par audience académique (niveau + filière + université).
userSchema.index({ niveau: 1, filiereId: 1, universiteId: 1 });

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
