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
router.get("/users", authenticate("admin"), async (req, res) => {
  try {
    const users = await User.find({}, "-password").lean();
    // Transform the data to match frontend expectations
    const formattedUsers = users.map(user => ({
      id: user._id,
      username: user.username,
      role: user.role,
      status: user.status || 'active' // Add default status if not present
    }));
    res.json(formattedUsers);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create new user (Admin only)
router.post("/users", authenticate("admin"), async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    const newUser = new User({
      username,
      password: hashedPassword,
      role,
      status: 'active'
    });

    await newUser.save();
    
    const userData = {
      id: newUser._id,
      username: newUser.username,
      role: newUser.role,
      status: newUser.status
    };

    res.status(201).json(userData);
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update user (Admin only)
router.put("/users/:id", authenticate("admin"), async (req, res) => {
  const { username, role, status } = req.body;

  try {
    const updateData = {
      ...(username && { username }),
      ...(role && { role }),
      ...(status && { status })
    };

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, select: "-password" }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = {
      id: user._id,
      username: user.username,
      role: user.role,
      status: user.status
    };

    res.json(userData);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete user (Admin only)
router.delete("/users/:id", authenticate("admin"), async (req, res) => {
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
