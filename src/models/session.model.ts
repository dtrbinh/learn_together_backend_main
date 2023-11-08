import mongoose from "mongoose";

export interface SessionDocument extends mongoose.Document {
  user: mongoose.Schema.Types.ObjectId;
  valid: boolean;
  userAgent: string;

  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new mongoose.Schema<SessionDocument>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    valid: { type: Boolean, default: true },
    userAgent: { type: String },
  },
  {
    timestamps: true,
  }
);

const SessionModel = mongoose.model<SessionDocument>("Session", sessionSchema);

export default SessionModel;