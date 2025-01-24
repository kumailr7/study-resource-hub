const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/Users"); // Correct path to the User model
const authenticate = require("../middleware/authenticate"); // Middleware for admin-only access

const router = express.Router();

// Register a new user
router.post("/register", async (req, res) => {
  const { username, password, role } = req.body;

  try {
    console.log("Received registration request:", { username, role });

    // Check if the user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log("User already exists");
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 8);
    console.log("Password hashed successfully");

    // Save the new user
    const newUser = new User({ username, password: hashedPassword, role });
    await newUser.save();
    console.log("User registered successfully");

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Error in /register route:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all users (Admin only)
router.get("/", authenticate("admin"), async (req, res) => {
  try {
    const users = await User.find({}, "username role"); // Fetch only username and role
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update a user's role (Admin only)
router.put("/:id/role", authenticate("admin"), async (req, res) => {
  const { role } = req.body;

  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("Error updating user role:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a user (Admin only)
router.delete("/:id", authenticate("admin"), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
