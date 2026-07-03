import express from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "../config/s3.js";
import { requireAuth } from "../middleware/auth.js";
import Session from "../models/Session.js";
import Track from "../models/Track.js";

const router = express.Router();

// GET /api/sessions  → all sessions hosted by the logged-in user
router.get("/", requireAuth, async (req, res) => {
  try {
    const sessions = await Session.find({ host: req.userId }).sort({
      createdAt: -1,
    });
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:id/tracks  → all recordings in one session
router.get("/:id/tracks", requireAuth, async (req, res) => {
  try {
    const tracks = await Track.find({ session: req.params.id })
      .populate("user", "name email") // pull in the recorder's name
      .sort({ createdAt: 1 });
    res.json({ tracks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/track/:id/play  → a temporary signed URL to play a recording
router.get("/track/:id/play", requireAuth, async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);
    if (!track || !track.url) {
      return res.status(404).json({ error: "Recording not found" });
    }

    // Rebuild the S3 "key" (path inside the bucket) from the stored URL
    const key = new URL(track.url).pathname.slice(1); // drop the leading "/"

    // Generate a link that works for 1 hour
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    res.json({ url: signedUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;