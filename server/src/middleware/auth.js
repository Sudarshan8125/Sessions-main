import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  // The client sends the token in a header: "Authorization: Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1]; // grab the part after "Bearer "

  try {
    // Verify the token was signed by us and hasn't expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; // attach the user's id for the route to use
    next(); // token is valid → let the request continue
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}