import mongoose, { Schema, Document } from 'mongoose';

export enum NotificationType {
  NOUVEAU_COURS = 'NOUVEAU_COURS',
  RAPPEL = 'RAPPEL',
  BADGE = 'BADGE',
  EPREUVE = 'EPREUVE',
}

export interface INotification extends Document {
  id: string;
  userId: string;
  titre: string;
  corps: string;
  type: NotificationType;
  lu: boolean;
  metadata?: any;
  createdAt: Date;
  readAt?: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: String,
      required: true,
    },
    titre: {
      type: String,
      required: true,
    },
    corps: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    lu: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, lu: 1 });

export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);
