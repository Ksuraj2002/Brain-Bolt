import mongoose, { Schema } from 'mongoose';

export interface IUser {
  _id: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    _id: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

export default mongoose.model<IUser>('User', UserSchema);
