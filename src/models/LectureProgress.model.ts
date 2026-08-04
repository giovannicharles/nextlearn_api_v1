import mongoose, { Schema, Document } from 'mongoose';

export interface ILectureProgress extends Document {
  id: string;
  userId: string;
  documentId: string;
  pageCourante: number;
  totalPages: number;
  tempsTotalSecondes: number;
  derniereLecture: Date;
  createdAt: Date;
  updatedAt: Date;
}

const lectureProgressSchema = new Schema<ILectureProgress>(
  {
    userId: {
      type: String,
      required: true,
    },
    documentId: {
      type: String,
      required: true,
    },
    pageCourante: {
      type: Number,
      default: 0,
    },
    totalPages: {
      type: Number,
      required: true,
    },
    tempsTotalSecondes: {
      type: Number,
      default: 0,
    },
    derniereLecture: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

lectureProgressSchema.index({ userId: 1, documentId: 1 }, { unique: true });

export const LectureProgress = mongoose.models.LectureProgress || mongoose.model<ILectureProgress>('LectureProgress', lectureProgressSchema);
