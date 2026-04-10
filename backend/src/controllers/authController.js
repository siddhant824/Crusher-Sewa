import bcrypt from "bcrypt";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  // Validation messages
  if (!name || !email || !password) {
    return res.status(400).json({ 
      message: "Please fill in all fields" 
    });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ 
      message: "Name must be at least 2 characters long" 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      message: "Password must be at least 6 characters long" 
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      message: "Please enter a valid email address" 
    });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ 
        message: "This email is already registered. Please use a different email or try logging in." 
      });
    }

    // Force CONTRACTOR role for public registration
    const user = await User.create({ 
      name: name.trim(), 
      email: email.toLowerCase().trim(), 
      password, 
      role: "CONTRACTOR",
      isActive: true 
    });
    const token = generateToken(user);

    return res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
      message: "Account created successfully! Welcome to Crusher Material Sewa.",
    });
  } catch (err) {
    // Handle Mongoose validation errors
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        message: errors[0] || "Validation failed. Please check your input." 
      });
    }
    
    return res.status(500).json({ 
      message: "Something went wrong. Please try again later." 
    });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      message: "Please enter both email and password" 
    });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ 
        message: "Invalid email or password. Please check your credentials and try again." 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        message: "Your account has been deactivated. Please contact support for assistance." 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        message: "Invalid email or password. Please check your credentials and try again." 
      });
    }

    const token = generateToken(user);

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
      message: `Welcome back, ${user.name}!`,
    });
  } catch (err) {
    return res.status(500).json({ 
      message: "Something went wrong. Please try again later." 
    });
  }
};

export const updateMyProfile = async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      message: "Name and email are required",
    });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({
      message: "Name must be at least 2 characters long",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      message: "Please enter a valid email address",
    });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail !== user.email) {
      const existingEmailUser = await User.findOne({ email: normalizedEmail });
      if (existingEmailUser) {
        return res.status(400).json({
          message: "This email is already in use by another account",
        });
      }
    }

    user.name = name.trim();
    user.email = normalizedEmail;
    await user.save();

    return res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to update profile",
    });
  }
};

