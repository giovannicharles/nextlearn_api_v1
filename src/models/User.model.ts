import mongoose, { Schema, Document } from 'mongoose';

export enum NiveauEtude {
  L1 = 'L1',
  L2 = 'L2',
  L3 = 'L3',
  M1 = 'M1',
  M2 = 'M2',
}

export enum Langue {
  FR = 'FR',
  EN = 'EN',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface IUser extends Document {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  universite: string;
  filiere: string;
  niveau: NiveauEtude;
  langue: Langue;
  role: UserRole;
  pinHash?: string;
  avatarUrl?: string;
  fcmToken?: string;
  isEmailVerified: boolean;
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
      enum: Object.values(UserRole),
      default: UserRole.USER,
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

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
