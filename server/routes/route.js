/**
 * Route API - POST /api/route
 * Orchestrates: geocode → route → sample → AI waypoints → nearby facilities → response
 */

const express = require('express');
const router = express.Router();
const { geocodeLocation, getRoute, sampleRoutePoints } = require('../services/orsService');
const { getSafeWaypoints } = require('../services/openaiService');
const { searchNearby } = require('../services/locationiqService');

/**
 * Find hospitals and police stations along the route
 * Samples every ~25km to avoid too many API calls
 */
async function findFacilitiesAlongRoute(geometry) {
    const samplePoints = [];
    const coords = geometry.coordinates;

    // Sample roughly every 25km for facility search
    const step = Math.max(1, Math.floor(coords.length / 8));
    for (let i = 0; i < coords.length; i += step) {
        samplePoints.push({ lat: coords[i][1], lng: coords[i][0] });
    }
    // Always include last point
    samplePoints.push({ lat: coords[coords.length - 1][1], lng: coords[coords.length - 1][0] });

    const hospitals = [];
    const policeStations = [];
    const seenHospitals = new Set();
    const seenPolice = new Set();

    // Query a subset of points (max 4) to limit API calls
    const queryPoints = samplePoints.length > 4
        ? [samplePoints[0], samplePoints[Math.floor(samplePoints.length / 3)], samplePoints[Math.floor(2 * samplePoints.length / 3)], samplePoints[samplePoints.length - 1]]
        : samplePoints;

    for (const point of queryPoints) {
        try {
            // Search hospitals first
            let nearHospitals = [];
            try {
                nearHospitals = await searchNearby(point.lat, point.lng, 'hospital', 5000);
            } catch (e) {
                console.warn(`   ⚠️ Hospital search failed at [${point.lat}, ${point.lng}]:`, e.message);
            }

            // Wait before next API call (rate limit)
            await new Promise((r) => setTimeout(r, 500));

            // Then search police
            let nearPolice = [];
            try {
                nearPolice = await searchNearby(point.lat, point.lng, 'police', 5000);
            } catch (e) {
                console.warn(`   ⚠️ Police search failed at [${point.lat}, ${point.lng}]:`, e.message);
            }

            console.log(`   📍 Point [${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}]: ${nearHospitals.length} hospitals, ${nearPolice.length} police`);

            nearHospitals.forEach((h) => {
                const key = `${h.latitude.toFixed(4)},${h.longitude.toFixed(4)}`;
                if (!seenHospitals.has(key)) {
                    seenHospitals.add(key);
                    hospitals.push(h);
                }
            });

            nearPolice.forEach((p) => {
                const key = `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`;
                if (!seenPolice.has(key)) {
                    seenPolice.add(key);
                    policeStations.push(p);
                }
            });

            // Rate limiting pause before next point
            await new Promise((r) => setTimeout(r, 500));
        } catch (err) {
            console.warn(`Facility search failed for point [${point.lat}, ${point.lng}]:`, err.message);
        }
    }

    return { hospitals, policeStations };
}

/**
 * POST /api/route
 * Body: { start: string, end: string, profile: string }
 * Response includes route, waypoints, and nearby facilities
 */
router.post('/route', async (req, res) => {
    try {
        const { start, end, profile } = req.body;

        // --- Input validation ---
        if (!start || !start.trim()) {
            return res.status(400).json({ error: 'Start location is required.' });
        }
        if (!end || !end.trim()) {
            return res.status(400).json({ error: 'Destination location is required.' });
        }

        const travelProfile = profile || 'driving-car';
        console.log(`\n🗺️  Route request: "${start}" → "${end}" (${travelProfile})`);

        // --- Step 1: Geocode both locations ---
        console.log('📍 Geocoding locations...');
        const [startGeo, endGeo] = await Promise.all([
            geocodeLocation(start.trim()),
            geocodeLocation(end.trim()),
        ]);
        const startCoords = startGeo.coordinates;
        const endCoords = endGeo.coordinates;
        const startLabel = startGeo.label || start.trim();
        const endLabel = endGeo.label || end.trim();
        console.log(`   Start: ${startLabel} [${startCoords}]  End: ${endLabel} [${endCoords}]`);

        // --- Step 2: Get the route from ORS ---
        console.log('🛣️  Fetching route...');
        const { geometry, distance, duration, steps } = await getRoute(startCoords, endCoords, travelProfile);
        const distanceKm = distance / 1000;
        console.log(`   Distance: ${distanceKm.toFixed(1)} km, Duration: ${(duration / 60).toFixed(0)} min`);

        // --- Step 3: Sample route points (adaptive interval based on distance) ---
        console.log('📌 Sampling route points...');
        const sampleInterval = distanceKm < 3 ? 1 : distanceKm < 10 ? 3 : 8;
        const sampledPoints = sampleRoutePoints(geometry, sampleInterval);
        console.log(`   Sampled ${sampledPoints.length} points along route (every ${sampleInterval} km)`);

        // --- Step 4: Get safe waypoints from Gemini ---
        let waypoints = [];
        let aiError = null;
        try {
            console.log('🤖 Requesting safe waypoints from Gemini...');
            waypoints = await getSafeWaypoints(sampledPoints, start, end, distanceKm);
            console.log(`   Received ${waypoints.length} safe waypoints`);
        } catch (aiErr) {
            console.warn('⚠️  Gemini failed, returning route without waypoints:', aiErr.message);
            aiError = aiErr.message;
        }

        // --- Step 5: Find hospitals and police along route ---
        let facilities = { hospitals: [], policeStations: [] };
        try {
            console.log('🏥👮 Finding facilities along route...');
            facilities = await findFacilitiesAlongRoute(geometry);
            console.log(`   Found ${facilities.hospitals.length} hospitals, ${facilities.policeStations.length} police stations`);
        } catch (facErr) {
            console.warn('⚠️  Facility search failed:', facErr.message);
        }

        // --- Step 6: Send response ---
        res.json({
            route: {
                type: 'Feature',
                geometry,
                properties: {},
            },
            distance,
            duration,
            steps,
            startName: startLabel,
            endName: endLabel,
            startCoords,
            endCoords,
            travelProfile,
            waypoints,
            hospitals: facilities.hospitals,
            policeStations: facilities.policeStations,
            ...(aiError && { aiError }),
        });


        console.log('✅ Route response sent successfully\n');
    } catch (err) {
        console.error('❌ Route error:', err.message);
        res.status(500).json({
            error: err.message || 'An unexpected error occurred while generating the route.',
        });
    }
});

module.exports = router;
