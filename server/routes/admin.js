/**
 * Admin Routes — Admin-only analytics endpoints
 * GET    /api/admin/stats        — Total users & saved paths count
 * GET    /api/admin/users        — Full user list with saved routes detail
 * DELETE /api/admin/users/:id    — Delete a user by ID
 */

const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

const router = express.Router();

/**
 * GET /api/admin/stats
 * Returns: { totalUsers, totalSavedPaths, users: [{ username, savedPathsCount, joinedAt }] }
 */
router.get('/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const users = await User.find().select('username savedRoutes createdAt').lean();

        const totalUsers = users.length;
        const totalSavedPaths = users.reduce(
            (sum, u) => sum + (u.savedRoutes ? u.savedRoutes.length : 0),
            0
        );

        // Per-user breakdown (sorted by saved count desc, then newest first)
        const userBreakdown = users
            .map((u) => ({
                username: u.username,
                savedPathsCount: u.savedRoutes ? u.savedRoutes.length : 0,
                joinedAt: u.createdAt,
            }))
            .sort((a, b) => b.savedPathsCount - a.savedPathsCount || new Date(b.joinedAt) - new Date(a.joinedAt));

        res.json({ totalUsers, totalSavedPaths, users: userBreakdown });
    } catch (err) {
        console.error('❌ Admin stats error:', err.message);
        res.status(500).json({ error: 'Failed to fetch admin stats.' });
    }
});

/**
 * GET /api/admin/users
 * Returns full user list with saved routes details for the user panel
 */
router.get('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const users = await User.find()
            .select('username savedRoutes createdAt')
            .lean();

        const result = users.map((u) => ({
            _id: u._id,
            username: u.username,
            joinedAt: u.createdAt,
            savedRoutes: (u.savedRoutes || []).map((r) => ({
                _id: r._id,
                startName: r.startName,
                endName: r.endName,
                profile: r.profile,
                distance: r.distance,
                duration: r.duration,
                savedAt: r.savedAt,
            })),
        }));

        // Sort: most saved routes first
        result.sort((a, b) => b.savedRoutes.length - a.savedRoutes.length);

        res.json({ users: result });
    } catch (err) {
        console.error('❌ Admin users error:', err.message);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

/**
 * DELETE /api/admin/users/:id
 * Deletes a user account (admin cannot delete themselves)
 */
router.delete('/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // Prevent admin from deleting themselves
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own admin account.' });
        }

        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        console.log(`🗑️ Admin deleted user: ${user.username}`);
        res.json({ message: `User "${user.username}" deleted successfully.` });
    } catch (err) {
        console.error('❌ Delete user error:', err.message);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

module.exports = router;
