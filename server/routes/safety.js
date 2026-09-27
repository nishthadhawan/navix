/**
 * Safety Score Route
 * Reads pre-processed India_SubDistrict_Summary_Scored.csv
 * which contains normalized safety scores (0-1) and OSM estimated areas.
 *
 * GET /api/safety-scores         → all subdistricts with scores
 * GET /api/safety-scores?state=X → filter by state
 * GET /api/safety-scores?q=X     → search by subdistrict/district name
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const CSV_PATH = path.join(__dirname, '..', 'data', 'India_SubDistrict_Summary_Scored.csv');

// --- Get safety color and label based on normalized (0-1) score ---
function getSafetyMeta(score) {
    if (score >= 0.8) return { label: 'Very Safe', color: '#10b981' };
    if (score >= 0.6) return { label: 'Safe', color: '#22c55e' };
    if (score >= 0.4) return { label: 'Moderate', color: '#eab308' };
    if (score >= 0.2) return { label: 'Low Safety', color: '#f97316' };
    return { label: 'Very Low', color: '#ef4444' };
}

// --- CSV Parser ---
function parseCSVRow(row) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current.trim());
    return fields;
}

// Cache parsed data in memory
let cachedData = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

function loadData() {
    const now = Date.now();
    if (cachedData && (now - cacheTime) < CACHE_TTL) {
        return cachedData;
    }

    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const results = [];

    // Skip header (State, District, SubDistrict, No_Hospital, No_Police, OSM_Area_SqKm, Normalized_Safety_Score)
    for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVRow(lines[i]);
        if (fields.length < 7) continue;

        const rawScore = parseFloat(fields[6]) || 0;
        // Normalize to 0-1 and cap at 0.95 (no perfect score)
        const score = Math.min(rawScore, 0.95);
        const meta = getSafetyMeta(score);

        results.push({
            state: fields[0],
            district: fields[1],
            subDistrict: fields[2],
            hospitals: parseInt(fields[3]) || 0,
            policeStations: parseInt(fields[4]) || 0,
            estimatedAreaKm2: parseFloat(fields[5]) || 0,
            safetyScore: score,
            safetyLabel: meta.label,
            safetyColor: meta.color,
        });
    }

    // Sort by score descending
    results.sort((a, b) => b.safetyScore - a.safetyScore);

    cachedData = results;
    cacheTime = now;
    return results;
}

// --- GET /api/safety-scores ---
router.get('/safety-scores', (req, res) => {
    try {
        let data = loadData();
        const { state, district, q, limit } = req.query;

        // Filter by state
        if (state) {
            data = data.filter(d => d.state.toLowerCase().includes(state.toLowerCase()));
        }

        // Filter by district
        if (district) {
            data = data.filter(d => d.district.toLowerCase().includes(district.toLowerCase()));
        }

        // Search by name
        if (q) {
            const query = q.toLowerCase();
            data = data.filter(d =>
                d.subDistrict.toLowerCase().includes(query) ||
                d.district.toLowerCase().includes(query) ||
                d.state.toLowerCase().includes(query)
            );
        }

        const total = data.length;
        const avgScore = total > 0
            ? (data.reduce((s, d) => s + d.safetyScore, 0) / total).toFixed(4)
            : 0;
        const safest = data.length > 0 ? data[0] : null;
        const leastSafe = data.length > 0 ? data[data.length - 1] : null;

        const maxItems = parseInt(limit) || 100;
        const limited = data.slice(0, maxItems);

        res.json({
            total,
            showing: limited.length,
            avgScore: parseFloat(avgScore),
            safest: safest ? { name: `${safest.subDistrict}, ${safest.district}`, score: safest.safetyScore } : null,
            leastSafe: leastSafe ? { name: `${leastSafe.subDistrict}, ${leastSafe.district}`, score: leastSafe.safetyScore } : null,
            subdistricts: limited,
        });
    } catch (err) {
        console.error('❌ Failed to fetch safety scores:', err.message);
        res.status(500).json({ error: 'Failed to fetch safety scores.' });
    }
});

module.exports = router;
