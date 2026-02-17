import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaderboardScore extends Document {
  userId: string;
  totalScore: number;
  updatedAt: Date;
}

const LeaderboardScoreSchema = new Schema<ILeaderboardScore>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    totalScore: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: 'updatedAt' },
  }
);

// Index on totalScore for leaderboard queries (descending)
LeaderboardScoreSchema.index({ totalScore: -1 });

export default mongoose.model<ILeaderboardScore>('LeaderboardScore', LeaderboardScoreSchema);
