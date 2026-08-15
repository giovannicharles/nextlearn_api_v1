import mongoose, { Schema, Document } from 'mongoose';

export interface IEpreuveRating extends Document {
  id: string;
  epreuveId: string;
  userId: string;
  note: number;
  createdAt: Date;
}

const epreuveRatingSchema = new Schema<IEpreuveRating>(
  {
    epreuveId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    note: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

epreuveRatingSchema.index({ epreuveId: 1, userId: 1 }, { unique: true });

export const EpreuveRating = mongoose.models.EpreuveRating || mongoose.model<IEpreuveRating>('EpreuveRating', epreuveRatingSchema);
