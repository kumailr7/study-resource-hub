const jwt = require("jsonwebtoken");

const authenticate = (requiredRole = null) => (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (requiredRole && decoded.role !== requiredRole) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }

    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

module.exports = authenticate;
