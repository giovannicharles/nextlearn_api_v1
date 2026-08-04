import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  id: string;
  quizId: string;
  enonce: string;
  options: string[];
  bonneReponseIndex: number;
  explication: string;
  ordre: number;
  createdAt: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    quizId: {
      type: String,
      required: true,
    },
    enonce: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      required: true,
    },
    bonneReponseIndex: {
      type: Number,
      required: true,
    },
    explication: {
      type: String,
      required: true,
    },
    ordre: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.index({ quizId: 1 });

export const Question = mongoose.models.Question || mongoose.model<IQuestion>('Question', questionSchema);
