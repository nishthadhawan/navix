/**
 * LocationIQ Service - Find nearby hospitals and police stations
 * Uses LocationIQ Nearby Places API
 */

const axios = require('axios');

const API_KEY = process.env.LOCATIONIQ_API_KEY;
const BASE_URL = 'https://us1.locationiq.com/v1';

/**
 * Search for nearby places using LocationIQ Nearby API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} tag - POI tag (e.g. 'hospital', 'police')
 * @param {number} radius - Search radius in meters (default 5000)
 * @returns {Array} - Nearby places with name, lat, lon, distance
 */
async function searchNearby(lat, lon, tag, radius = 5000) {
    try {
        const res = await axios.get(`${BASE_URL}/nearby`, {
            params: {
                key: API_KEY,
                lat,
                lon,
                tag,
                radius,
                format: 'json',
                limit: 5,
            },
        });

        // LocationIQ returns an array of places
        const places = Array.isArray(res.data) ? res.data : [];

        return places.map((place) => ({
            name: place.display_name?.split(',')[0] || place.name || 'Unknown',
            fullAddress: place.display_name || '',
            latitude: parseFloat(place.lat),
            longitude: parseFloat(place.lon),
            distance: place.distance ? parseFloat(place.distance) : calculateDistance(lat, lon, parseFloat(place.lat), parseFloat(place.lon)),
            type: tag,
        }));
    } catch (err) {
        const status = err.response?.status;
        console.warn(`LocationIQ nearby (${tag}) status ${status || 'N/A'} — falling back to search`);

        // On rate limit (429), wait before fallback
        if (status === 429) {
            await new Promise((r) => setTimeout(r, 1000));
        }

        // Always fall back to POI search
        try {
            return await searchPOIFallback(lat, lon, tag, radius);
        } catch (fallbackErr) {
            console.error(`LocationIQ fallback also failed for ${tag}:`, fallbackErr.message);
            return [];
        }
    }
}

/**
 * Fallback: use LocationIQ search with viewbox to find nearby POIs
 */
async function searchPOIFallback(lat, lon, tag, radius) {
    try {
        const degreeOffset = radius / 111000; // rough km to degree conversion
        const res = await axios.get(`${BASE_URL}/search`, {
            params: {
                key: API_KEY,
                q: tag === 'police' ? 'police station' : tag,
                format: 'json',
                viewbox: `${lon - degreeOffset},${lat + degreeOffset},${lon + degreeOffset},${lat - degreeOffset}`,
                bounded: 1,
                limit: 5,
            },
        });

        const places = Array.isArray(res.data) ? res.data : [];

        return places.map((place) => ({
            name: place.display_name?.split(',')[0] || 'Unknown',
            fullAddress: place.display_name || '',
            latitude: parseFloat(place.lat),
            longitude: parseFloat(place.lon),
            distance: calculateDistance(lat, lon, parseFloat(place.lat), parseFloat(place.lon)),
            type: tag,
        })).sort((a, b) => a.distance - b.distance);
    } catch (err) {
        console.error(`LocationIQ fallback search failed for ${tag}:`, err.message);
        throw new Error(`Failed to find nearby ${tag}`);
    }
}

/**
 * Calculate distance between two points using Haversine formula
 * @returns distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

module.exports = { searchNearby };
