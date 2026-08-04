import mongoose, { Schema, Document } from 'mongoose';

export interface IBadge extends Document {
  id: string;
  userId: string;
  type: string;
  titre: string;
  description: string;
  earnedAt: Date;
}

const badgeSchema = new Schema<IBadge>(
  {
    userId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    titre: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    earnedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

badgeSchema.index({ userId: 1, type: 1 }, { unique: true });

export const Badge = mongoose.models.Badge || mongoose.model<IBadge>('Badge', badgeSchema);
