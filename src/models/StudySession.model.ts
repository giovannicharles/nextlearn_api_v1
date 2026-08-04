import mongoose, { Schema, Document } from 'mongoose';

export interface IStudySession extends Document {
  id: string;
  userId: string;
  documentId: string;
  date: Date;
  dureeSecondes: number;
  pagesLues: number;
  createdAt: Date;
}

const studySessionSchema = new Schema<IStudySession>(
  {
    userId: {
      type: String,
      required: true,
    },
    documentId: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    dureeSecondes: {
      type: Number,
      required: true,
    },
    pagesLues: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

studySessionSchema.index({ userId: 1, date: -1 });

export const StudySession = mongoose.models.StudySession || mongoose.model<IStudySession>('StudySession', studySessionSchema);
