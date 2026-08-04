import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizAnswer extends Document {
  id: string;
  quizResultId: string;
  questionId: string;
  reponseIndex: number;
  estCorrect: boolean;
}

const quizAnswerSchema = new Schema<IQuizAnswer>(
  {
    quizResultId: {
      type: String,
      required: true,
    },
    questionId: {
      type: String,
      required: true,
    },
    reponseIndex: {
      type: Number,
      required: true,
    },
    estCorrect: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const QuizAnswer = mongoose.models.QuizAnswer || mongoose.model<IQuizAnswer>('QuizAnswer', quizAnswerSchema);
