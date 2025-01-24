const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/Users"); // Ensure the correct path and model name
const router = express.Router();

// Login Endpoint
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Validate the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET, // Ensure JWT_SECRET is set in your .env file
      { expiresIn: "1h" }
    );

    // Return the token and user role
    res.json({ token, role: user.role });
  } catch (err) {
    console.error("Error in /login route:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

