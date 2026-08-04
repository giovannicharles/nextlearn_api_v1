import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizResult extends Document {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  dureeSecondes: number;
  createdAt: Date;
}

const quizResultSchema = new Schema<IQuizResult>(
  {
    userId: {
      type: String,
      required: true,
    },
    quizId: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    dureeSecondes: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

quizResultSchema.index({ userId: 1, quizId: 1 });

export const QuizResult = mongoose.models.QuizResult || mongoose.model<IQuizResult>('QuizResult', quizResultSchema);
