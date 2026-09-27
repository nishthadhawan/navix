/**
 * RouteForm Component
 * Handles user input for start location, destination, and travel mode.
 * Fetches location autocomplete suggestions as the user types.
 */

import { useState, useEffect, useRef } from 'react';

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjFmNzM0OWVhNWQxOTQ1MDJhOGVlMmVkNDBhZjM0NzFmIiwiaCI6Im11cm11cjY0In0=';
const ORS_AUTOCOMPLETE_URL = 'https://api.openrouteservice.org/geocode/autocomplete';

const API_BASE_URL =
    import.meta.env.VITE_API_URL || "https://navix-backend-uly4.onrender.com";

// Debounce helper
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

// ORS autocomplete — best POI coverage for India
// Coordinates are stored on selection and sent directly, so geocoding accuracy isn't an issue
async function fetchSuggestions(query, signal, focusCoords = null) {
    const focusLat = focusCoords ? focusCoords[1] : 28.6;
    const focusLon = focusCoords ? focusCoords[0] : 77.2;

    const params = new URLSearchParams({
        api_key: ORS_API_KEY,
        text: query,
        'boundary.country': 'IND',
        'focus.point.lat': String(focusLat),
        'focus.point.lon': String(focusLon),
        size: '10',
    });

    const res = await fetch(`${ORS_AUTOCOMPLETE_URL}?${params.toString()}`, { signal });
    const data = await res.json();
    if (!data.features) return [];

    return data.features.map((f) => {
        const p = f.properties;
        const city = p.locality || p.county || '';
        const state = p.region || '';
        const regionParts = [...new Set([city, state].filter(Boolean))];

        return {
            name: p.name || '',
            label: p.label || '',
            region: regionParts.join(', '),
            country: p.country || 'India',
            coordinates: f.geometry.coordinates, // [lng, lat]
        };
    });
}

export default function RouteForm({ onSubmit, isLoading }) {
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [profile, setProfile] = useState('driving');
    const [locating, setLocating] = useState(false);

    // Autocomplete state
    const [startSuggestions, setStartSuggestions] = useState([]);
    const [endSuggestions, setEndSuggestions] = useState([]);
    const [showStartDropdown, setShowStartDropdown] = useState(false);
    const [showEndDropdown, setShowEndDropdown] = useState(false);

    // Track if user explicitly selected from dropdown to prevent re-fetching on the exact same name
    const startSelectedRef = useRef(false);
    const endSelectedRef = useRef(false);
    const startAbortRef = useRef(null);
    const endAbortRef = useRef(null);
    // Store coordinates when user picks from autocomplete
    const startCoordsRef = useRef(null);
    const endCoordsRef = useRef(null);

    const debouncedStart = useDebounce(start, 200);
    const debouncedEnd = useDebounce(end, 200);

    // Fetch start suggestions (direct to ORS)
    useEffect(() => {
        if (!debouncedStart || debouncedStart.length < 2) {
            setStartSuggestions([]);
            return;
        }
        if (startSelectedRef.current) {
            startSelectedRef.current = false;
            return;
        }
        // Cancel any in-flight request
        if (startAbortRef.current) startAbortRef.current.abort();
        const controller = new AbortController();
        startAbortRef.current = controller;

        fetchSuggestions(debouncedStart, controller.signal, endCoordsRef.current)
            .then(data => {
                setStartSuggestions(data);
                if (data.length > 0) setShowStartDropdown(true);
            })
            .catch(err => { if (err.name !== 'AbortError') console.error("Autocomplete error:", err); });
    }, [debouncedStart]);

    // Fetch end suggestions (direct to ORS)
    useEffect(() => {
        if (!debouncedEnd || debouncedEnd.length < 2) {
            setEndSuggestions([]);
            return;
        }
        if (endSelectedRef.current) {
            endSelectedRef.current = false;
            return;
        }
        // Cancel any in-flight request
        if (endAbortRef.current) endAbortRef.current.abort();
        const controller = new AbortController();
        endAbortRef.current = controller;

        fetchSuggestions(debouncedEnd, controller.signal, startCoordsRef.current)
            .then(data => {
                setEndSuggestions(data);
                if (data.length > 0) setShowEndDropdown(true);
            })
            .catch(err => { if (err.name !== 'AbortError') console.error("Autocomplete error:", err); });
    }, [debouncedEnd]);

    // Use browser geolocation to fill start field
    const useCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                startSelectedRef.current = true; // Prevent autocomplete trigger
                setStart(`${latitude.toFixed(6)},${longitude.toFixed(6)}`);
                setLocating(false);
            },
            (error) => {
                alert('Unable to get your location. Please allow location access.');
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleSelectSuggestion = (suggestion, type) => {
        // Format: Name, Region, Country
        const parts = [suggestion.name];
        if (suggestion.region && suggestion.region !== suggestion.name) parts.push(suggestion.region);
        if (suggestion.country) parts.push(suggestion.country);
        const displayName = parts.join(', ');

        if (type === 'start') {
            startSelectedRef.current = true;
            startCoordsRef.current = suggestion.coordinates; // [lng, lat]
            setStart(displayName);
            setShowStartDropdown(false);
        } else {
            endSelectedRef.current = true;
            endCoordsRef.current = suggestion.coordinates; // [lng, lat]
            setEnd(displayName);
            setShowEndDropdown(false);
        }
    };

    // Handle form submission with validation
    const handleSubmit = (e) => {
        e.preventDefault();
        setShowStartDropdown(false);
        setShowEndDropdown(false);
        if (!start.trim() || !end.trim()) return;

        // Map friendly names to ORS profile identifiers
        const profileMap = {
            driving: 'driving-car',
            cycling: 'cycling-regular',
            walking: 'foot-walking',
        };

        // If user selected from autocomplete, send exact coordinates
        // Otherwise send text for backend geocoding
        const startVal = startCoordsRef.current
            ? `${startCoordsRef.current[1]},${startCoordsRef.current[0]}`
            : start.trim();
        const endVal = endCoordsRef.current
            ? `${endCoordsRef.current[1]},${endCoordsRef.current[0]}`
            : end.trim();

        onSubmit({
            start: startVal,
            end: endVal,
            profile: profileMap[profile] || 'driving-car',
        });
    };

    return (
        <div className="glass-card route-form">
            <div className="form-title">
                <span className="icon"><img src="/logo.png" alt="NaviX" style={{ width: '24px', height: '24px' }} /></span>
                Plan Your Safe Route
            </div>

            <form onSubmit={handleSubmit}>
                {/* Start Location */}
                <div className="form-group autocomplete-container">
                    <label htmlFor="start">Start Location</label>
                    <div className="input-with-btn">
                        <input
                            id="start"
                            type="text"
                            placeholder="e.g. Mumbai, India"
                            value={start}
                            onChange={(e) => {
                                setStart(e.target.value);
                                startCoordsRef.current = null;
                                setShowStartDropdown(true);
                            }}
                            onFocus={() => {
                                if (startSuggestions.length > 0) setShowStartDropdown(true);
                            }}
                            onBlur={() => setTimeout(() => setShowStartDropdown(false), 200)}
                            disabled={isLoading}
                            autoComplete="off"
                        />
                        <button
                            type="button"
                            className="locate-btn"
                            onClick={useCurrentLocation}
                            disabled={isLoading || locating}
                            title="Use my current location"
                        >
                            {locating ? '⏳' : '📍'}
                        </button>
                    </div>
                    {/* Start Suggestions Dropdown */}
                    {showStartDropdown && startSuggestions.length > 0 && (
                        <ul className="autocomplete-dropdown">
                            {startSuggestions.map((s, i) => (
                                <li key={i} onClick={() => handleSelectSuggestion(s, 'start')}>
                                    <span className="ac-icon">📍</span>
                                    <div className="ac-text">
                                        <strong>{s.name}</strong>
                                        <small>{s.region || 'India'}</small>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Destination */}
                <div className="form-group autocomplete-container">
                    <label htmlFor="end">Destination</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            id="end"
                            type="text"
                            placeholder="e.g. Pune, India"
                            value={end}
                            onChange={(e) => {
                                setEnd(e.target.value);
                                endCoordsRef.current = null;
                                setShowEndDropdown(true);
                            }}
                            onFocus={() => {
                                if (endSuggestions.length > 0) setShowEndDropdown(true);
                            }}
                            onBlur={() => setTimeout(() => setShowEndDropdown(false), 200)}
                            disabled={isLoading}
                            autoComplete="off"
                            style={{ width: '100%' }}
                        />
                    </div>
                    {/* End Suggestions Dropdown */}
                    {showEndDropdown && endSuggestions.length > 0 && (
                        <ul className="autocomplete-dropdown">
                            {endSuggestions.map((s, i) => (
                                <li key={i} onClick={() => handleSelectSuggestion(s, 'end')}>
                                    <span className="ac-icon">📍</span>
                                    <div className="ac-text">
                                        <strong>{s.name}</strong>
                                        <small>{s.region || 'India'}</small>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Travel Mode */}
                <div className="form-group">
                    <label htmlFor="profile">Travel Mode</label>
                    <select
                        id="profile"
                        value={profile}
                        onChange={(e) => setProfile(e.target.value)}
                        disabled={isLoading}
                    >
                        <option value="driving">🚗 Driving</option>
                        <option value="cycling">🚴 Cycling</option>
                        <option value="walking">🚶 Walking</option>
                    </select>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className="btn-submit"
                    disabled={isLoading || !start.trim() || !end.trim()}
                >
                    {isLoading ? (
                        <>
                            <span className="spinner"></span>
                            Generating Route...
                        </>
                    ) : (
                        <>🛡️ Find Safest Route</>
                    )}
                </button>
            </form>
        </div>
    );
}
