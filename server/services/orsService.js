/**
 * ORS Service - Handles all OpenRouteService API interactions
 * - Geocoding locations to coordinates
 * - Fetching route directions
 * - Sampling route points at regular intervals
 */

const axios = require('axios');

const ORS_BASE = 'https://api.openrouteservice.org';
const API_KEY = process.env.ORS_API_KEY;

// Map user-friendly profile names to ORS profile identifiers
const PROFILE_MAP = {
  'driving-car': 'driving-car',
  'driving': 'driving-car',
  'cycling-regular': 'cycling-regular',
  'cycling': 'cycling-regular',
  'foot-walking': 'foot-walking',
  'walking': 'foot-walking',
};

/**
 * Geocode a location string to [longitude, latitude] coordinates
 * Accepts either a text query or a "lat,lon" coordinate string
 * Returns { coordinates: [lng, lat], label: string }
 */
async function geocodeLocation(query) {
  // Detect if query is already coordinates (e.g. "19.076,72.877")
  const coordMatch = query.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    // Reverse geocode to get a place name
    let label = query;
    try {
      const rev = await axios.get(`${ORS_BASE}/geocode/reverse`, {
        params: {
          api_key: API_KEY,
          'point.lat': lat,
          'point.lon': lon,
          size: 1,
        },
      });
      if (rev.data.features && rev.data.features.length > 0) {
        const p = rev.data.features[0].properties;
        label = p.name || p.label || p.locality || query;
      }
    } catch {
      // Keep raw coordinates as label if reverse geocode fails
    }
    return { coordinates: [lon, lat], label };
  }

  try {
    const res = await axios.get(`${ORS_BASE}/geocode/search`, {
      params: {
        api_key: API_KEY,
        text: query,
        size: 1,
        'boundary.country': 'IND',
        'focus.point.lat': 22.5,
        'focus.point.lon': 78.9,
      },
    });

    const features = res.data.features;
    if (!features || features.length === 0) {
      throw new Error(`Could not geocode location: "${query}"`);
    }

    const props = features[0].properties;
    const label = props.name || props.label || query;

    return { coordinates: features[0].geometry.coordinates, label };
  } catch (err) {
    if (err.response) {
      throw new Error(`Geocoding failed for "${query}": ${err.response.data.error || err.response.statusText}`);
    }
    throw err;
  }
}

/**
 * Autocomplete location string to a list of suggestions
 * Uses ORS Geocode /autocomplete endpoint
 */
async function autocompleteLocation(query) {
  try {
    const res = await axios.get(`${ORS_BASE}/geocode/autocomplete`, {
      params: {
        api_key: API_KEY,
        text: query,
      },
    });

    const features = res.data.features;
    if (!features) return [];

    return features.map((feature) => ({
      name: feature.properties.name,
      label: feature.properties.label,
      region: feature.properties.region,
      country: feature.properties.country,
      coordinates: feature.geometry.coordinates, // [lng, lat]
    }));
  } catch (err) {
    console.warn(`Autocomplete failed for "${query}":`, err.message);
    return []; // Return empty array on failure so it doesn't break the UI
  }
}

/**
 * Get route between two coordinate pairs using ORS Directions API
 * @param {number[]} startCoords - [lng, lat]
 * @param {number[]} endCoords - [lng, lat]
 * @param {string} profile - travel mode
 * @returns {{ geometry: object, distance: number, duration: number }}
 */
async function getRoute(startCoords, endCoords, profile = 'driving-car') {
  const orsProfile = PROFILE_MAP[profile] || 'driving-car';

  try {
    const res = await axios.post(
      `${ORS_BASE}/v2/directions/${orsProfile}/geojson`,
      {
        coordinates: [startCoords, endCoords],
      },
      {
        headers: {
          Authorization: API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const feature = res.data.features[0];
    const { geometry } = feature;
    const { distance, duration } = feature.properties.summary;

    // Extract turn-by-turn steps from the first segment
    let steps = [];
    if (feature.properties.segments && feature.properties.segments.length > 0) {
      steps = feature.properties.segments[0].steps || [];
    }

    return { geometry, distance, duration, steps };
  } catch (err) {
    if (err.response) {
      throw new Error(`Route request failed: ${err.response.data.error?.message || err.response.statusText}`);
    }
    throw err;
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * @returns distance in kilometers
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Sample the route polyline at approximately every `intervalKm` kilometers
 * Returns array of { lat, lng, distFromStartKm }
 */
function sampleRoutePoints(geometry, intervalKm = 8) {
  const coords = geometry.coordinates; // [ [lng, lat], ... ]
  const sampled = [];
  let accumulatedKm = 0;
  let nextSampleKm = intervalKm;

  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];
    const segmentKm = haversineKm(lat1, lng1, lat2, lng2);

    accumulatedKm += segmentKm;

    // Check if we've passed the next sampling threshold
    if (accumulatedKm >= nextSampleKm) {
      sampled.push({
        lat: lat2,
        lng: lng2,
        distFromStartKm: Math.round(accumulatedKm * 10) / 10,
      });
      nextSampleKm = accumulatedKm + intervalKm;
    }
  }

  return sampled;
}

module.exports = { geocodeLocation, autocompleteLocation, getRoute, sampleRoutePoints, haversineKm };
