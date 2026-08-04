import mongoose, { Schema, Document } from 'mongoose';

export interface IRefreshToken extends Document {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  revoked: boolean;
  deviceInfo?: string;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revoked: {
      type: Boolean,
      default: false,
    },
    deviceInfo: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

refreshTokenSchema.index({ userId: 1 });

export const RefreshToken = mongoose.models.RefreshToken || mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);
