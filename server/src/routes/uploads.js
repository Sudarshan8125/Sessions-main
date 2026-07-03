import express from "express";
import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "../config/s3.js";
import { requireAuth } from "../middleware/auth.js";
import Track from "../models/Track.js";
import Session from "../models/Session.js";

const router = express.Router();

// Keep the uploaded file in memory (as a buffer) rather than saving to disk
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/uploads  (protected: only logged-in users)
// Expects multipart/form-data with: "recording" (the file) and "sessionCode"
router.post("/", requireAuth, upload.single("recording"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { sessionCode } = req.body;

    // Find the session this recording belongs to (create one if it doesn't exist)
    // Find THIS user's session for this room code (create if they don't have one yet)
    let session = await Session.findOne({
        code: sessionCode || "test-room",
        host: req.userId,
      });
      if (!session) {
        session = await Session.create({
          host: req.userId,
          code: sessionCode || "test-room",
        });
      }

    // Create a Track first, marked "pending"
    const track = await Track.create({
      session: session._id,
      user: req.userId,
      status: "pending",
    });

    // Build a unique key (path) for the file inside the bucket
    const key = `recordings/${session._id}/${track._id}.webm`;

    // Upload the file buffer to S3
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype || "video/webm",
      })
    );

    // Upload succeeded → update the Track with the URL and mark "uploaded"
    const url = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    track.url = url;
    track.status = "uploaded";
    await track.save();

    res.status(201).json({ track });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;