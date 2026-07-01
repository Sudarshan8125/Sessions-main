import mongoose from "mongoose";

const trackSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    url: { type: String, default: "" }, // where the recording lives (S3 later)
    status: {
      type: String,
      enum: ["pending", "uploaded", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Track", trackSchema);