const fs = require('fs');
const path = require('path');

const INPUT_CSV = path.join(__dirname, '..', 'server', 'data', 'India_SubDistrict_Summary.csv');
const OUTPUT_CSV = path.join(__dirname, '..', 'server', 'data', 'India_SubDistrict_Summary_Scored.csv');

// --- Parse coordinate list string like "[(lat, lng), (lat, lng)]" ---
function parseCoordinates(locStr) {
    if (!locStr || locStr === '[]') return [];
    const coords = [];
    const regex = /\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(locStr)) !== null) {
        const parts = match[1].split(',').map(s => parseFloat(s.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            coords.push({ lat: parts[0], lng: parts[1] });
        }
    }
    return coords;
}

// --- Estimate area (sq km) from bounding box of OSM coordinates ---
function estimateAreaKm2(allCoords) {
    if (allCoords.length < 2) return 1; // Default minimum area

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    for (const c of allCoords) {
        if (c.lat < minLat) minLat = c.lat;
        if (c.lat > maxLat) maxLat = c.lat;
        if (c.lng < minLng) minLng = c.lng;
        if (c.lng > maxLng) maxLng = c.lng;
    }

    const latDiffKm = (maxLat - minLat) * 111;
    const avgLat = (minLat + maxLat) / 2;
    const lngDiffKm = (maxLng - minLng) * 111 * Math.cos((avgLat * Math.PI) / 180);

    const area = latDiffKm * lngDiffKm;
    return Math.max(area, 1); // Minimum 1 sq km
}

// --- Compute safety score Normalized (0 to 1) ---
function computeNormalizedSafetyScore(numHospitals, numPolice, areaKm2) {
    const hospitalDensity = Math.min(numHospitals / areaKm2, 5);
    const policeDensity = Math.min(numPolice / areaKm2, 3);

    const hospitalScore = Math.min(hospitalDensity / 2.0, 1.0);
    const policeScore = Math.min(policeDensity / 1.0, 1.0);

    const hasHospital = numHospitals > 0 ? 1 : 0;
    const hasPolice = numPolice > 0 ? 1 : 0;
    const presenceScore = (hasHospital * 0.6 + hasPolice * 0.4);

    const rawScore = (hospitalScore * 0.40) + (policeScore * 0.35) + (presenceScore * 0.25);

    // Return float between 0 and 1, rounded to 4 decimal places
    return Math.round(rawScore * 10000) / 10000;
}

function parseCSVRow(row) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    let bracketDepth = 0;

    for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '"' && bracketDepth === 0) {
            inQuotes = !inQuotes;
        } else if (ch === '[') {
            bracketDepth++;
            current += ch;
        } else if (ch === ']') {
            bracketDepth--;
            current += ch;
        } else if (ch === ',' && !inQuotes && bracketDepth === 0) {
            fields.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current.trim());
    return fields;
}

function escapeCSV(val) {
    if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
}

async function processData() {
    console.log('Reading source CSV...');
    if (!fs.existsSync(INPUT_CSV)) {
        console.error('Source CSV not found:', INPUT_CSV);
        return;
    }

    const content = fs.readFileSync(INPUT_CSV, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());

    const outLines = [];
    outLines.push('State,District,SubDistrict,No_Hospital,No_Police,OSM_Area_SqKm,Normalized_Safety_Score');

    let processed = 0;

    for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVRow(lines[i]);
        if (fields.length < 7) continue;

        const state = fields[0].trim();
        const district = fields[1].trim();
        const subDistrict = fields[2].trim();
        const numHospitals = parseInt(fields[3]) || 0;
        const hospitalLocStr = fields[4];
        const numPolice = parseInt(fields[5]) || 0;
        const policeLocStr = fields[6];

        const allCoords = [...parseCoordinates(hospitalLocStr), ...parseCoordinates(policeLocStr)];
        const areaKm2 = estimateAreaKm2(allCoords);
        const score0to1 = computeNormalizedSafetyScore(numHospitals, numPolice, areaKm2);

        outLines.push([
            escapeCSV(state),
            escapeCSV(district),
            escapeCSV(subDistrict),
            numHospitals,
            numPolice,
            (Math.round(areaKm2 * 100) / 100).toFixed(2),
            score0to1.toFixed(4)
        ].join(','));

        processed++;
    }

    fs.writeFileSync(OUTPUT_CSV, outLines.join('\n'));
    console.log(`✅ Successfully processed ${processed} subdistricts.`);
    console.log(`💾 Saved normalized scores to: ${OUTPUT_CSV}`);
}

processData();
