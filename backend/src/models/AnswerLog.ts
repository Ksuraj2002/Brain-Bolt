import mongoose, { Schema, Document } from 'mongoose';

export interface IAnswerLog extends Document {
  userId: string;
  questionId: string;
  difficulty: number;
  answer?: string;
  correct: boolean;
  scoreDelta: number;
  streakAtAnswer: number;
  answeredAt: Date;
  idempotencyKey?: string;
}

const AnswerLogSchema = new Schema<IAnswerLog>(
  {
    userId: {
      type: String,
      required: true,
    },
    questionId: {
      type: String,
      required: true,
    },
    difficulty: {
      type: Number,
      required: true,
    },
    answer: {
      type: String,
      required: false,
    },
    correct: {
      type: Boolean,
      required: true,
    },
    scoreDelta: {
      type: Number,
      required: true,
    },
    streakAtAnswer: {
      type: Number,
      required: true,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true, // Allow null values but enforce uniqueness when present
    },
  },
  {
    timestamps: { createdAt: 'answeredAt', updatedAt: false },
  }
);

// Indexes for faster queries
AnswerLogSchema.index({ userId: 1 });
AnswerLogSchema.index({ answeredAt: -1 });
// idempotencyKey uses `unique: true` on the field itself, no schema.index needed

export default mongoose.model<IAnswerLog>('AnswerLog', AnswerLogSchema);
