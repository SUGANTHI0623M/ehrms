const express = require('express');
const router = express.Router();
// We will create the controller logic momentarily, assuming user registration/login
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// In your existing login route
// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            // Update last login
            user.lastLogin = new Date();
            await user.save();

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Google Login Route
router.post('/google-login', async (req, res) => {
    const { email } = req.body; // In production, verify ID token here

    try {
        const user = await User.findOne({ email });

        if (user) {
            // Update last login
            user.lastLogin = new Date();
            await user.save();

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                token: generateToken(user._id),
            });
        } else {
            // User not found
            res.status(401).json({ message: 'User not registered. Please sign up first.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Register Route (For Admin/Setup)
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const user = await User.create({ name, email, password });
        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;