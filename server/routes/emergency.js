/**
 * Emergency Contact Routes
 * GET  /api/emergency — Fetch user's emergency contact
 * PUT  /api/emergency — Save/update emergency contact
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Auth middleware
function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// GET — Fetch emergency contact
router.get('/emergency', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('emergencyContact');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user.emergencyContact || { name: '', phone: '', shakeEnabled: false });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch emergency contact' });
    }
});

// PUT — Save/update emergency contact
router.put('/emergency', auth, async (req, res) => {
    try {
        const { name, phone, shakeEnabled } = req.body;

        // Basic validation
        if (phone && !/^[\d\s\+\-\(\)]{7,20}$/.test(phone.trim())) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.emergencyContact = {
            name: (name || '').trim().slice(0, 50),
            phone: (phone || '').trim().slice(0, 20),
            shakeEnabled: Boolean(shakeEnabled),
        };

        await user.save();
        res.json({ message: 'Emergency contact saved', emergencyContact: user.emergencyContact });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save emergency contact' });
    }
});

module.exports = router;
