/**
 * Admin Middleware — Restricts access to the admin user only
 * Admin user ID: 69c2e46f3e2c7b09c8291257
 */

const ADMIN_ID = '69c2e46f3e2c7b09c8291257';

module.exports = function adminMiddleware(req, res, next) {
    // req.user is set by the auth middleware
    if (!req.user || req.user.id !== ADMIN_ID) {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    next();
};
