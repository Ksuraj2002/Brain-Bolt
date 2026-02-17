import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  difficulty: number;
  prompt: string;
  choices: string[];
  correctAnswerHash: string;
  tags: string[];
  createdAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    difficulty: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    prompt: {
      type: String,
      required: true,
    },
    choices: {
      type: [String],
      required: true,
    },
    correctAnswerHash: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

// Index on difficulty for faster queries
QuestionSchema.index({ difficulty: 1 });

export default mongoose.model<IQuestion>('Question', QuestionSchema);
