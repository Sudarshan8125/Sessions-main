import { io } from "socket.io-client";

// Don't connect immediately — we connect only when the user clicks Join
const socket = io("http://localhost:5001", {
  autoConnect: false,
});

export default socket;