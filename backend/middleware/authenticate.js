const jwt = require("jsonwebtoken");

const authenticate = (requiredRole = null) => (req, res, next) => {
  // Get token from Authorization header
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ 
      error: "Unauthorized: No token provided",
      isAuthenticated: false 
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request object
    req.user = {
      id: decoded.id,
      role: decoded.role,
      isAuthenticated: true,
      isAdmin: decoded.role === 'admin'
    };

    // Check for required role if specified
    if (requiredRole && decoded.role !== requiredRole) {
      return res.status(403).json({ 
        error: "Forbidden: Insufficient permissions",
        isAuthenticated: true,
        isAdmin: false
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({ 
      error: "Unauthorized: Invalid token",
      isAuthenticated: false 
    });
  }
};

module.exports = authenticate;
