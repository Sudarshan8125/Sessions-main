import { io } from "socket.io-client";

// Don't connect immediately — we connect only when the user clicks Join
const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5001", {
  autoConnect: false,
});

export default socket;