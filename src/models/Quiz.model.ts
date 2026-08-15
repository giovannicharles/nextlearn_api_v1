import mongoose, { Schema, Document } from 'mongoose';

export interface IQuiz extends Document {
  id: string;
  documentId: string;
  matiereId: string;
  titre: string;
  dureeSecondes: number;
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const quizSchema = new Schema<IQuiz>(
  {
    documentId: {
      type: String,
      required: true,
    },
    matiereId: {
      type: String,
      ref: 'Matiere',
      required: true,
    },
    titre: {
      type: String,
      required: true,
    },
    dureeSecondes: {
      type: Number,
      required: true,
    },
    actif: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Quiz = mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', quizSchema);
