/**
 * Feedback API — MongoDB Version
 * POST /api/feedback      — Save feedback (any authenticated user)
 * GET  /api/feedback       — List all feedback (admin only)
 */

const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

/**
 * POST /api/feedback — Save a new review
 * Optionally authenticated (attaches user info if logged in)
 */
router.post('/feedback', async (req, res) => {
    try {
        const { safety, condition, accessibility, websiteRating, comments, startName, startCoords, endName, endCoords } = req.body;

        if (!safety || !condition || !accessibility || !websiteRating) {
            return res.status(400).json({ error: 'All ratings are required.' });
        }

        // Try to extract user from token (optional)
        let userId = null;
        let username = 'anonymous';
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
                userId = decoded.id;
                username = decoded.username;
            } catch (e) {
                // Token invalid — continue as anonymous
            }
        }

        const feedback = new Feedback({
            safety,
            condition,
            accessibility,
            websiteRating,
            comments: comments || '',
            startName: startName || '',
            startLat: startCoords ? startCoords[1] : undefined,
            startLng: startCoords ? startCoords[0] : undefined,
            endName: endName || '',
            endLat: endCoords ? endCoords[1] : undefined,
            endLng: endCoords ? endCoords[0] : undefined,
            userId,
            username,
        });

        await feedback.save();
        console.log(`📝 Feedback saved from ${username}: safety=${safety}, condition=${condition}`);

        res.json({ success: true, message: 'Feedback saved successfully.' });
    } catch (err) {
        console.error('❌ Failed to save feedback:', err.message);
        res.status(500).json({ error: 'Failed to save feedback.' });
    }
});

/**
 * GET /api/feedback — Retrieve all reviews (admin only)
 * Requires JWT auth + admin check
 */
router.get('/feedback', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const feedbacks = await Feedback.find()
            .sort({ createdAt: -1 })
            .lean();

        const reviews = feedbacks.map(f => ({
            timestamp: f.createdAt,
            startName: f.startName,
            startLat: f.startLat,
            startLng: f.startLng,
            endName: f.endName,
            endLat: f.endLat,
            endLng: f.endLng,
            safety: f.safety,
            condition: f.condition,
            accessibility: f.accessibility,
            websiteRating: f.websiteRating,
            comments: f.comments,
            username: f.username,
        }));

        res.json({ total: reviews.length, reviews });
    } catch (err) {
        console.error('❌ Failed to read feedback:', err.message);
        res.status(500).json({ error: 'Failed to load reviews.' });
    }
});

module.exports = router;
