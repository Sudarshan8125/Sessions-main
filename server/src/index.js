import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import { requireAuth } from "./middleware/auth.js";
import uploadRoutes from "./routes/uploads.js";
import sessionRoutes from "./routes/sessions.js";

connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/uploads", uploadRoutes);
app.use("/api/sessions", sessionRoutes);

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ userId: req.userId });
});

// Wrap the Express app in a raw HTTP server so Socket.IO can attach to it
const server = http.createServer(app);

// Create the Socket.IO server, allowing connections from our Vite frontend
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// This runs every time a browser connects
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);              // put this socket into the room
    socket.data.roomId = roomId;      // remember which room, for cleanup later
    console.log(`${socket.id} joined room ${roomId}`);

    // Tell everyone ELSE in the room that a new peer arrived
    socket.to(roomId).emit("user-joined", socket.id);
  });

  socket.on("offer", ({ roomId, offer }) => {
    socket.to(roomId).emit("offer", { offer });
  });

  socket.on("answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("answer", { answer });
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", { candidate });
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    const roomId = socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit("user-left", socket.id);
    }
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});