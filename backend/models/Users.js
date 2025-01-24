const mongoose = require('mongoose');

// Define User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], default: "user" },
});

// Export the User model
module.exports = mongoose.model("User", userSchema);
