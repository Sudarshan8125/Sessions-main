import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // stored hashed, never plain
  },
  { timestamps: true } // auto-adds createdAt / updatedAt
);

export default mongoose.model("User", userSchema);