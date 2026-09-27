/**
 * AI Service - Uses Groq (LLaMA) to suggest safe waypoints along a route
 * Built with robust error handling and exponential backoff for rate limits
 * Groq uses the OpenAI-compatible SDK format
 *
 * KEY: Waypoints are distributed evenly across the route by assigning
 * each waypoint to a specific distance segment (zone) of the route.
 */

const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
});

/**
 * Delay helper for exponential backoff
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Build the system instruction that tells the AI about safety criteria
 */
function buildSystemInstruction() {
    return `You are an expert travel safety advisor. Your job is to suggest the safest possible waypoints along a given route.

CRITICAL RULE: Each waypoint MUST be located within its assigned distance zone along the route. You MUST spread waypoints EVENLY across the entire route from start to finish. Do NOT cluster waypoints in one area.

Safety criteria for each waypoint:
- Must be close to the main route with minimal divergence
- Must have at least one hospital within 2 km
- Must have at least one police station within 2 km
- Prefer populated residential or commercial areas
- Avoid forests, isolated highways, industrial zones, and low-density regions
- Must be road-accessible

You must respond with ONLY valid JSON — no markdown, no explanation, no code fences. Just a JSON array of objects.`;
}

/**
 * Build the user prompt with zone-based distribution
 * Each waypoint is assigned to a specific km segment of the route
 */
function buildUserPrompt(sampledPoints, startName, endName, totalDistKm, waypointCount) {
    const pointsList = sampledPoints
        .map(
            (p, i) =>
                `  Point ${i + 1}: lat=${p.lat}, lng=${p.lng} (~${p.distFromStartKm} km from start)`
        )
        .join('\n');

    // Create evenly spaced zones along the route
    const zoneSize = totalDistKm / waypointCount;
    const zones = [];
    for (let i = 0; i < waypointCount; i++) {
        const zoneStart = Math.round(zoneSize * i);
        const zoneEnd = Math.round(zoneSize * (i + 1));
        zones.push(`  Zone ${i + 1}: between ${zoneStart} km and ${zoneEnd} km from start`);
    }

    return `I am traveling from "${startName}" to "${endName}" (total distance: ~${Math.round(totalDistKm)} km).

Here are sampled points along my route:
${pointsList}

I need exactly ${waypointCount} safe stop locations, ONE in each of these distance zones:
${zones.join('\n')}

IMPORTANT: Each waypoint MUST fall within its assigned zone. Pick the safest populated area near the route within each zone. The waypoints should be spread across the ENTIRE route from start to finish.

Return ONLY a JSON array in this exact format (ordered from zone 1 to zone ${waypointCount}):
[
  {
    "name": "Location Name",
    "latitude": 00.000000,
    "longitude": 00.000000,
    "nearest_hospital": "Hospital Name",
    "nearest_police_station": "Police Station Name",
    "approx_distance_from_start_km": 0,
    "zone": 1,
    "reason": "Why this location is safe"
  }
]

Return ONLY the JSON array, nothing else.`;
}

/**
 * Call Groq API and parse the response as JSON
 * Implements exponential backoff for rate limit errors
 *
 * Waypoint count logic:
 *   - Routes >= 8 km: request 5 waypoints evenly distributed
 *   - Routes >= 3 km: request 3 waypoints evenly distributed
 *   - Routes >= 1 km: request 2 waypoints evenly distributed
 *   - Routes >= 0.5 km: request 1 waypoint (midpoint safe stop)
 *   - Routes < 0.5 km: return empty (too short for waypoints)
 */
async function getSafeWaypoints(sampledPoints, startName, endName, totalDistKm, maxRetries = 3) {
    // If route is too short, return empty array
    if (totalDistKm < 0.5) {
        return [];
    }

    // If no sampled points available, return empty
    if (!sampledPoints || sampledPoints.length === 0) {
        return [];
    }

    // Determine how many waypoints to request based on distance
    let waypointCount;
    if (totalDistKm >= 8) {
        waypointCount = 5;
    } else if (totalDistKm >= 3) {
        waypointCount = 3;
    } else if (totalDistKm >= 1) {
        waypointCount = 2;
    } else {
        waypointCount = 1;
    }

    const systemInstruction = buildSystemInstruction();
    const userPrompt = buildUserPrompt(sampledPoints, startName, endName, totalDistKm, waypointCount);

    let retryCount = 0;
    let baseDelayMs = 2000;

    while (retryCount <= maxRetries) {
        try {
            const completion = await openai.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3,
            });

            let content = completion.choices[0].message.content.trim();

            // Strip markdown code fences if present
            content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

            try {
                const parsed = JSON.parse(content);
                let waypoints;

                if (Array.isArray(parsed)) {
                    waypoints = parsed;
                } else if (parsed && typeof parsed === 'object') {
                    const keys = Object.keys(parsed);
                    if (keys.length === 1 && Array.isArray(parsed[keys[0]])) {
                        waypoints = parsed[keys[0]];
                    } else {
                        throw new Error('JSON is not an array or object containing an array');
                    }
                } else {
                    throw new Error('Parsed JSON is not array/object');
                }

                // Ensure each waypoint has required fields, limit to requested count
                return waypoints.slice(0, waypointCount).map((wp) => ({
                    name: wp.name || 'Unknown Location',
                    latitude: parseFloat(wp.latitude) || 0,
                    longitude: parseFloat(wp.longitude) || 0,
                    nearest_hospital: wp.nearest_hospital || 'Unknown',
                    nearest_police_station: wp.nearest_police_station || 'Unknown',
                    approx_distance_from_start_km: parseFloat(wp.approx_distance_from_start_km) || 0,
                    reason: wp.reason || 'Safe location along the route',
                }));

            } catch (parseErr) {
                throw new Error(`Failed to parse AI JSON: ${parseErr.message}`);
            }

        } catch (err) {
            console.warn(`⚠️ Groq attempt ${retryCount + 1}/${maxRetries + 1} failed: ${err.message}`);

            if (retryCount === maxRetries) {
                throw new Error(`Fatally failed after ${maxRetries} retries: ${err.message}`);
            }

            if (err.status === 429 || err.message.includes('429') || err.message.includes('Too Many Requests') || err.message.includes('quota')) {
                const waitTime = baseDelayMs * Math.pow(2, retryCount);
                console.warn(`⏳ Rate limited by Groq (429). Waiting ${waitTime / 1000}s before retry...`);
                await delay(waitTime);
            } else {
                await delay(1000);
            }

            retryCount++;
        }
    }
}

module.exports = { getSafeWaypoints };
