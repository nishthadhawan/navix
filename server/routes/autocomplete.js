/**
 * Autocomplete API - GET /api/autocomplete?q=...
 * Provides location suggestions as the user types
 */

const express = require('express');
const router = express.Router();
const { autocompleteLocation } = require('../services/orsService');

router.get('/autocomplete', async (req, res) => {
    try {
        const query = req.query.q;

        if (!query || query.trim().length < 3) {
            return res.json([]);
        }

        const suggestions = await autocompleteLocation(query.trim());
        res.json(suggestions);
    } catch (err) {
        console.error('❌ Autocomplete error:', err.message);
        res.status(500).json({
            error: err.message || 'An unexpected error occurred during autocomplete.',
        });
    }
});

module.exports = router;
