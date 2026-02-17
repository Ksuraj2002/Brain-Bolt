import mongoose, { Schema, Document } from 'mongoose';

export interface IUserState extends Document {
  userId: string;
  currentDifficulty: number;
  streak: number;
  maxStreak: number;
  totalScore: number;
  lastQuestionId?: string;
  lastAnswerAt?: Date;
  stateVersion: number;
  confidenceScore: number;
  updatedAt: Date;
}

const UserStateSchema = new Schema<IUserState>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    currentDifficulty: {
      type: Number,
      required: true,
      default: 5,
      min: 1,
      max: 10,
    },
    streak: {
      type: Number,
      required: true,
      default: 0,
    },
    maxStreak: {
      type: Number,
      required: true,
      default: 0,
    },
    totalScore: {
      type: Number,
      required: true,
      default: 0,
    },
    lastQuestionId: {
      type: String,
      default: null,
    },
    lastAnswerAt: {
      type: Date,
      default: null,
    },
    stateVersion: {
      type: Number,
      required: true,
      default: 1,
    },
    confidenceScore: {
      type: Number,
      required: true,
      default: 0.5,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: 'updatedAt' },
  }
);

// userId already has `unique: true` which creates an index

export default mongoose.model<IUserState>('UserState', UserStateSchema);
