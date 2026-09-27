/**
 * Auth Routes — Signup, Login, Profile
 * POST /api/auth/signup
 * POST /api/auth/login
 * GET  /api/auth/profile (protected)
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
function generateToken(user) {
    return jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

/**
 * POST /api/auth/signup
 * Body: { username, password }
 */
router.post('/auth/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        // Check if username already exists
        const existingUser = await User.findOne({ username: username.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ error: 'Username already taken.' });
        }

        // Create user
        const user = new User({
            username: username.toLowerCase(),
            password,
        });
        await user.save();

        const token = generateToken(user);

        console.log(`✅ New user registered: ${user.username}`);

        res.status(201).json({
            token,
            user: { id: user._id, username: user.username },
        });
    } catch (err) {
        console.error('❌ Signup error:', err.message);
        res.status(500).json({ error: 'Signup failed. Please try again.' });
    }
});

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
router.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        // Find user
        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const token = generateToken(user);

        console.log(`✅ User logged in: ${user.username}`);

        res.json({
            token,
            user: { id: user._id, username: user.username },
        });
    } catch (err) {
        console.error('❌ Login error:', err.message);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

/**
 * GET /api/auth/profile (Protected)
 * Returns current user info + stats
 */
router.get('/auth/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Count feedback
        const Feedback = require('../models/Feedback');
        const feedbackCount = await Feedback.countDocuments({ userId: user._id });

        res.json({
            user: {
                id: user._id,
                username: user.username,
                createdAt: user.createdAt,
                savedRoutesCount: user.savedRoutes?.length || 0,
                feedbackCount,
                hasEmergencyContact: !!user.emergencyContact?.phone,
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch profile.' });
    }
});

/**
 * PUT /api/auth/change-password (Protected)
 * Body: { currentPassword, newPassword }
 */
router.put('/auth/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Both current and new password are required.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }

        user.password = newPassword;
        await user.save();

        console.log(`🔑 Password changed: ${user.username}`);
        res.json({ message: 'Password changed successfully.' });
    } catch (err) {
        console.error('❌ Change password error:', err.message);
        res.status(500).json({ error: 'Failed to change password.' });
    }
});

module.exports = router;
