import mongoose, { Schema, Document } from 'mongoose';

export enum OtpPurpose {
  REGISTER = 'REGISTER',
  LOGIN = 'LOGIN',
  RESET_PIN = 'RESET_PIN',
}

export interface IOtpCode extends Document {
  id: string;
  userId?: string;
  email: string;
  code: string;
  purpose: OtpPurpose;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  used: boolean;
  createdAt: Date;
}

const otpCodeSchema = new Schema<IOtpCode>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
    },
    email: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
      select: false,
    },
    purpose: {
      type: String,
      enum: Object.values(OtpPurpose),
      default: OtpPurpose.REGISTER,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

otpCodeSchema.index({ email: 1, purpose: 1 });
otpCodeSchema.index({ expiresAt: 1 });

export const OtpCode = mongoose.models.OtpCode || mongoose.model<IOtpCode>('OtpCode', otpCodeSchema);
