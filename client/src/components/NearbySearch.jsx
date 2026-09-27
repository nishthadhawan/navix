/**
 * NearbySearch Component
 * Premium UI for finding nearest hospitals and police stations
 * Supports both GPS geolocation and typed location search
 */

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjFmNzM0OWVhNWQxOTQ1MDJhOGVlMmVkNDBhZjM0NzFmIiwiaCI6Im11cm11cjY0In0=';
const ORS_AUTOCOMPLETE_URL = 'https://api.openrouteservice.org/geocode/autocomplete';
const API_URL = 'https://navix-backend-uly4.onrender.com/api';

// Debounce hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function NearbySearch({ onRouteRequest, isLoading }) {
    const [places, setPlaces] = useState([]);
    const [searchType, setSearchType] = useState(null);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    // Location input state
    const [locationInput, setLocationInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedCoords, setSelectedCoords] = useState(null);
    const [locationLabel, setLocationLabel] = useState('');
    const selectedRef = useRef(false);
    const abortRef = useRef(null);

    const debouncedInput = useDebounce(locationInput, 200);

    // Fetch autocomplete suggestions
    useEffect(() => {
        if (!debouncedInput || debouncedInput.length < 2) {
            setSuggestions([]);
            return;
        }
        if (selectedRef.current) {
            selectedRef.current = false;
            return;
        }
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const params = new URLSearchParams({
            api_key: ORS_API_KEY,
            text: debouncedInput,
            'boundary.country': 'IND',
            'focus.point.lat': '28.6',
            'focus.point.lon': '77.2',
            size: '8',
        });

        fetch(`${ORS_AUTOCOMPLETE_URL}?${params}`, { signal: controller.signal })
            .then(r => r.json())
            .then(data => {
                if (!data.features) return;
                const items = data.features.map((f) => {
                    const p = f.properties;
                    const city = p.locality || p.county || '';
                    const state = p.region || '';
                    const regionParts = [...new Set([city, state].filter(Boolean))];
                    return {
                        name: p.name || '',
                        region: regionParts.join(', '),
                        coordinates: f.geometry.coordinates,
                    };
                });
                setSuggestions(items);
                if (items.length > 0) setShowDropdown(true);
            })
            .catch(err => {
                if (err.name !== 'AbortError') console.error('Autocomplete error:', err);
            });
    }, [debouncedInput]);

    const handleSelectSuggestion = (s) => {
        selectedRef.current = true;
        setLocationInput(s.name);
        setSelectedCoords({ lat: s.coordinates[1], lon: s.coordinates[0] });
        setLocationLabel(s.name);
        setShowDropdown(false);
        setSuggestions([]);
    };

    const getUserLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    };
                    setUserLocation(loc);
                    resolve(loc);
                },
                () => reject(new Error('Location access denied. Please enable location permissions.')),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    };

    const handleSearch = async (type) => {
        setSearching(true);
        setError(null);
        setPlaces([]);
        setSearchType(type);

        try {
            // Use typed location if available, otherwise GPS
            let location;
            if (selectedCoords) {
                location = selectedCoords;
            } else if (userLocation) {
                location = userLocation;
            } else {
                location = await getUserLocation();
            }

            const response = await axios.post(`${API_URL}/nearby`, {
                lat: location.lat,
                lon: location.lon,
                type,
            });
            setPlaces(response.data.places || []);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Search failed');
        } finally {
            setSearching(false);
        }
    };

    const handlePlaceClick = (place) => {
        const origin = selectedCoords || userLocation;
        if (!origin) return;
        onRouteRequest({
            startLat: origin.lat,
            startLon: origin.lon,
            endLat: place.latitude,
            endLon: place.longitude,
            endName: place.name,
        });
    };

    const handleUseGPS = async () => {
        try {
            const loc = await getUserLocation();
            setLocationInput('📍 Current Location');
            setSelectedCoords(loc);
            setLocationLabel('Current Location');
            setShowDropdown(false);
        } catch (err) {
            setError(err.message);
        }
    };

    const formatDistance = (meters) => {
        if (!meters) return '';
        if (meters < 1000) return `${Math.round(meters)}m`;
        return `${(meters / 1000).toFixed(1)} km`;
    };

    return (
        <div className="nearby-section">
            <div className="nearby-header">
                <div className="nearby-title-row">
                    <div className="nearby-icon-box">📍</div>
                    <div>
                        <div className="nearby-title">Find Nearby Services</div>
                        <div className="nearby-desc">Locate emergency services near any location</div>
                    </div>
                </div>
            </div>

            {/* Location Input */}
            <div className="nearby-location-input">
                <div className="nearby-input-wrap">
                    <input
                        type="text"
                        placeholder="Type a location or use GPS →"
                        value={locationInput}
                        onChange={(e) => {
                            setLocationInput(e.target.value);
                            setSelectedCoords(null);
                            setShowDropdown(true);
                        }}
                        onFocus={() => {
                            if (suggestions.length > 0) setShowDropdown(true);
                        }}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        className="nearby-loc-field"
                        autoComplete="off"
                    />
                    <button
                        className="nearby-gps-btn"
                        onClick={handleUseGPS}
                        title="Use my current location"
                        type="button"
                    >
                        📍
                    </button>
                </div>

                {/* Autocomplete Dropdown */}
                {showDropdown && suggestions.length > 0 && (
                    <ul className="nearby-autocomplete-dropdown">
                        {suggestions.map((s, i) => (
                            <li key={i} onClick={() => handleSelectSuggestion(s)}>
                                <span className="ac-icon">📍</span>
                                <div className="ac-text">
                                    <strong>{s.name}</strong>
                                    <small>{s.region || 'India'}</small>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {selectedCoords && (
                    <div className="nearby-loc-badge">
                        ✅ Searching near: <strong>{locationLabel}</strong>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="nearby-buttons">
                <button
                    className="nearby-btn hospital-btn"
                    onClick={() => handleSearch('hospital')}
                    disabled={searching || isLoading}
                >
                    <div className="nearby-btn-icon-wrap hospital-icon-bg">
                        <span className="nearby-btn-icon">🏥</span>
                    </div>
                    <div className="nearby-btn-content">
                        <span className="nearby-btn-text">Hospitals</span>
                        <span className="nearby-btn-sub">Medical emergencies</span>
                    </div>
                </button>
                <button
                    className="nearby-btn police-btn"
                    onClick={() => handleSearch('police')}
                    disabled={searching || isLoading}
                >
                    <div className="nearby-btn-icon-wrap police-icon-bg">
                        <span className="nearby-btn-icon">👮</span>
                    </div>
                    <div className="nearby-btn-content">
                        <span className="nearby-btn-text">Police</span>
                        <span className="nearby-btn-sub">Safety & security</span>
                    </div>
                </button>
            </div>

            {/* Info strip */}
            {!searching && places.length === 0 && !error && (
                <div className="nearby-info-strip">
                    <div className="nearby-info-item">
                        <span>🔍</span> Type location or use GPS
                    </div>
                    <div className="nearby-info-item">
                        <span>⚡</span> One-tap directions
                    </div>
                </div>
            )}

            {/* Loading */}
            {searching && (
                <div className="nearby-loading">
                    <div className="spinner"></div>
                    <span>Finding nearby {searchType === 'hospital' ? 'hospitals' : 'police stations'}...</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="error-msg" style={{ marginTop: '12px' }}>
                    <span>⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            {/* Results */}
            {places.length > 0 && (
                <div className="nearby-results">
                    <div className="nearby-results-title">
                        {searchType === 'hospital' ? '🏥' : '👮'}{' '}
                        {places.length} {searchType === 'hospital' ? 'Hospitals' : 'Police Stations'} Found
                    </div>
                    <div className="nearby-list">
                        {places.map((place, index) => (
                            <div
                                key={index}
                                className="nearby-item"
                                onClick={() => handlePlaceClick(place)}
                                title="Click to get directions"
                            >
                                <div className="nearby-item-rank">{index + 1}</div>
                                <div className="nearby-item-info">
                                    <div className="nearby-item-name">{place.name}</div>
                                    <div className="nearby-item-distance">
                                        📏 {formatDistance(place.distance)} away
                                    </div>
                                </div>
                                <div className="nearby-item-arrow">→</div>
                            </div>
                        ))}
                    </div>
                    <div className="nearby-hint">Click any result to get directions</div>
                </div>
            )}
        </div>
    );
}
