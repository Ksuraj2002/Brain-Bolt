import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaderboardStreak extends Document {
  userId: string;
  maxStreak: number;
  updatedAt: Date;
}

const LeaderboardStreakSchema = new Schema<ILeaderboardStreak>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    maxStreak: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: 'updatedAt' },
  }
);

// Index on maxStreak for leaderboard queries (descending)
LeaderboardStreakSchema.index({ maxStreak: -1 });

export default mongoose.model<ILeaderboardStreak>('LeaderboardStreak', LeaderboardStreakSchema);
