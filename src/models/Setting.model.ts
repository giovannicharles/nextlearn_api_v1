import mongoose, { Schema, Document } from 'mongoose';

export type SettingType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface ISetting extends Document {
  key: string;
  value: any;
  type: SettingType;
  category: string;
  description: string;
  isPublic: boolean;
  updatedAt: Date;
  createdAt: Date;
}

const settingSchema = new Schema<ISetting>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'array', 'object'],
      required: true,
    },
    category: {
      type: String,
      required: true,
      default: 'general',
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Setting = mongoose.models.Setting || mongoose.model<ISetting>('Setting', settingSchema);
