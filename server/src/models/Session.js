import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    code: { type: String, required: true, unique: true }, // the join code
    title: { type: String, default: "Untitled session" },
  },
  { timestamps: true }
);

export default mongoose.model("Session", sessionSchema);