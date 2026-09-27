/**
 * Saved Routes API — Save, List, Delete user routes
 * GET    /api/saved-routes       — Get all saved routes for the user
 * POST   /api/saved-routes       — Save a new route (max 10)
 * DELETE /api/saved-routes/:id   — Delete a saved route by subdocument ID
 */

const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const MAX_SAVED_ROUTES = 10;

/**
 * GET /api/saved-routes
 * Returns the authenticated user's saved routes (sorted newest first)
 */
router.get('/saved-routes', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('savedRoutes');
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Sort newest first
        const routes = (user.savedRoutes || [])
            .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

        res.json({ routes, count: routes.length, max: MAX_SAVED_ROUTES });
    } catch (err) {
        console.error('❌ Get saved routes error:', err.message);
        res.status(500).json({ error: 'Failed to fetch saved routes.' });
    }
});

/**
 * POST /api/saved-routes
 * Body: { startName, endName, startCoords, endCoords, profile, distance, duration }
 * Enforces a max of 10 saved routes per user
 */
router.post('/saved-routes', authMiddleware, async (req, res) => {
    try {
        const { startName, endName, startCoords, endCoords, profile, distance, duration } = req.body;

        if (!startName || !endName) {
            return res.status(400).json({ error: 'Start and end names are required.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if ((user.savedRoutes || []).length >= MAX_SAVED_ROUTES) {
            return res.status(400).json({
                error: `You can save up to ${MAX_SAVED_ROUTES} routes. Please delete one first.`,
                limitReached: true,
            });
        }

        user.savedRoutes.push({
            startName,
            endName,
            startCoords: startCoords || '',
            endCoords: endCoords || '',
            profile: profile || 'driving-car',
            distance: distance || 0,
            duration: duration || 0,
        });

        await user.save();

        const saved = user.savedRoutes[user.savedRoutes.length - 1];

        console.log(`✅ Route saved by ${user.username}: ${startName} → ${endName}`);

        res.status(201).json({
            route: saved,
            count: user.savedRoutes.length,
            max: MAX_SAVED_ROUTES,
        });
    } catch (err) {
        console.error('❌ Save route error:', err.message);
        res.status(500).json({ error: 'Failed to save route.' });
    }
});

/**
 * DELETE /api/saved-routes/:id
 * Removes a saved route by its subdocument _id
 */
router.delete('/saved-routes/:id', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const routeIndex = user.savedRoutes.findIndex(
            (r) => r._id.toString() === req.params.id
        );

        if (routeIndex === -1) {
            return res.status(404).json({ error: 'Saved route not found.' });
        }

        user.savedRoutes.splice(routeIndex, 1);
        await user.save();

        console.log(`🗑️ Route deleted by ${user.username}`);

        res.json({
            message: 'Route deleted successfully.',
            count: user.savedRoutes.length,
            max: MAX_SAVED_ROUTES,
        });
    } catch (err) {
        console.error('❌ Delete route error:', err.message);
        res.status(500).json({ error: 'Failed to delete route.' });
    }
});

module.exports = router;
