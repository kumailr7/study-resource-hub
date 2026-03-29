const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/Users"); // Ensure the correct path and model name
const router = express.Router();

async function verifyTurnstile(token, remoteip) {
  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY || '',
    response: token,
    ...(remoteip ? { remoteip } : {}),
  });

  const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  const data = await resp.json();
  return data.success === true;
}

// Changed to match frontend endpoint /auth/login
router.post("/auth/login", async (req, res) => {
  const { username, password, turnstileToken } = req.body;

  // Verify Turnstile if secret key is configured
  if (process.env.TURNSTILE_SECRET_KEY) {
    if (!turnstileToken) {
      return res.status(400).json({ error: "Security verification required" });
    }
    const ip = req.headers['cf-connecting-ip'] || req.socket.remoteAddress;
    const valid = await verifyTurnstile(turnstileToken, ip);
    if (!valid) {
      return res.status(403).json({ error: "Security verification failed" });
    }
  }

  try {
    // Check if the user exists
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Validate the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET, // Ensure JWT_SECRET is set in your .env file
      { expiresIn: "1h" }
    );

    // Return the token, role, and isAuthenticated flag to match frontend expectations
    res.json({
      token,
      role: user.role,
      isAuthenticated: true,
      isAdmin: user.role === 'admin'
    });
  } catch (err) {
    console.error("Error in /auth/login route:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
