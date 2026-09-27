/**
 * Nearby API - POST /api/nearby
 * Finds nearest hospitals or police stations using LocationIQ
 */

const express = require('express');
const router = express.Router();
const { searchNearby } = require('../services/locationiqService');

/**
 * POST /api/nearby
 * Body: { lat: number, lon: number, type: "hospital"|"police" }
 * Response: { places: [...] }
 */
router.post('/nearby', async (req, res) => {
    try {
        const { lat, lon, type } = req.body;

        // --- Input validation ---
        if (!lat || !lon) {
            return res.status(400).json({ error: 'Location coordinates (lat, lon) are required.' });
        }
        if (!type || !['hospital', 'police'].includes(type)) {
            return res.status(400).json({ error: 'Type must be "hospital" or "police".' });
        }

        console.log(`\n🔍 Nearby search: ${type} near [${lat}, ${lon}]`);

        const places = await searchNearby(parseFloat(lat), parseFloat(lon), type, 5000);
        console.log(`   Found ${places.length} ${type}(s)`);

        res.json({ places });
    } catch (err) {
        console.error('❌ Nearby error:', err.message);
        res.status(500).json({
            error: err.message || 'Failed to find nearby places.',
        });
    }
});

module.exports = router;
