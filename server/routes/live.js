/**
 * Live Location Sharing API
 * POST /api/live/start   — Start a live sharing session (auth required)
 * POST /api/live/stop    — Stop the active session (auth required)
 * GET  /api/live/:sessionId — Get session info (public, for viewer page)
 */

const express = require('express');
const LiveSession = require('../models/LiveSession');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/live/start
 * Body: { startName, endName, routeGeometry, distance, duration }
 * Creates a new live session and returns the sessionId
 */
router.post('/live/start', authMiddleware, async (req, res) => {
    try {
        const { startName, endName, routeGeometry, distance, duration } = req.body;

        // Deactivate any existing active session for this user
        await LiveSession.updateMany(
            { userId: req.user.id, isActive: true },
            { isActive: false }
        );

        const session = new LiveSession({
            userId: req.user.id,
            username: req.user.username,
            startName: startName || 'Start',
            endName: endName || 'End',
            routeGeometry: routeGeometry || null,
            distance: distance || 0,
            duration: duration || 0,
        });

        await session.save();

        console.log(`📡 Live session started by ${req.user.username}: ${session.sessionId}`);

        res.status(201).json({
            sessionId: session.sessionId,
            message: 'Live session started.',
        });
    } catch (err) {
        console.error('❌ Start live session error:', err.message);
        res.status(500).json({ error: 'Failed to start live session.' });
    }
});

/**
 * POST /api/live/stop
 * Deactivates the user's active live session
 */
router.post('/live/stop', authMiddleware, async (req, res) => {
    try {
        const result = await LiveSession.updateMany(
            { userId: req.user.id, isActive: true },
            { isActive: false }
        );

        console.log(`⏹️ Live session stopped by ${req.user.username}`);

        res.json({
            message: 'Live session stopped.',
            stopped: result.modifiedCount,
        });
    } catch (err) {
        console.error('❌ Stop live session error:', err.message);
        res.status(500).json({ error: 'Failed to stop live session.' });
    }
});

/**
 * GET /api/live/:sessionId
 * Public — returns session info for the viewer page
 */
router.get('/live/:sessionId', async (req, res) => {
    try {
        const session = await LiveSession.findOne({ sessionId: req.params.sessionId });

        if (!session) {
            return res.status(404).json({ error: 'Session not found or expired.' });
        }

        res.json({
            sessionId: session.sessionId,
            username: session.username,
            startName: session.startName,
            endName: session.endName,
            routeGeometry: session.routeGeometry,
            distance: session.distance,
            duration: session.duration,
            isActive: session.isActive,
            lastLocation: session.lastLocation,
            createdAt: session.createdAt,
        });
    } catch (err) {
        console.error('❌ Get live session error:', err.message);
        res.status(500).json({ error: 'Failed to fetch session.' });
    }
});

module.exports = router;
