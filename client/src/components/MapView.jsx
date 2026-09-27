/**
 * MapView Component - Premium Map UI
 * Leaflet satellite map with:
 * - Animated route drawing with progressive "snake" effect and glow
 * - Premium SVG pin markers with pulse rings
 * - Styled floating popups
 * - Floating info overlay on the map
 * - Animated route playback with glowing cursor
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Marker Icons ────────────────────────────────────────────────────────────

function createPinIcon(color, size = 36, pulseColor = null) {
    const pulse = pulseColor
        ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${pulseColor};animation:map-pulse 2s ease-in-out infinite;opacity:0.7;pointer-events:none;"></div>`
        : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 12}" viewBox="0 0 ${size} ${size + 12}">
    <defs>
      <radialGradient id="pg${color.replace('#', '')}" cx="40%" cy="30%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.5)"/>
        <stop offset="100%" stop-color="${color}"/>
      </radialGradient>
      <filter id="ps${color.replace('#', '')}">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="${color}" flood-opacity="0.6"/>
        <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.4)"/>
      </filter>
    </defs>
    <path d="M${size / 2} 0C${size * 0.22} 0 0 ${size * 0.22} 0 ${size / 2}c0 ${size * 0.375} ${size / 2} ${size * 0.43} ${size / 2} ${size * 0.43}S${size} ${size * 0.875} ${size} ${size / 2}C${size} ${size * 0.22} ${size * 0.78} 0 ${size / 2} 0z"
      fill="url(#pg${color.replace('#', '')})" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" filter="url(#ps${color.replace('#', '')})"/>
    <circle cx="${size / 2}" cy="${size * 0.44}" r="${size * 0.18}" fill="white" opacity="0.95"/>
  </svg>`;

    const wrapper = `<div style="position:relative;width:${size}px;height:${size + 12}px;">${pulse}${svg}</div>`;
    return L.divIcon({
        html: wrapper,
        className: '',
        iconSize: [size, size + 12],
        iconAnchor: [size / 2, size + 12],
        popupAnchor: [0, -(size + 8)],
    });
}

function createFacilityIcon(emoji, bgColor, size = 28) {
    const html = `<div style="
    width:${size}px;height:${size}px;
    background:${bgColor};
    border:2.5px solid rgba(255,255,255,0.9);
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-size:${Math.round(size * 0.48)}px;
    box-shadow:0 3px 12px rgba(0,0,0,0.5),0 0 0 3px ${bgColor}44;
    line-height:1;
  ">${emoji}</div>`;
    return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2 - 4] });
}

function createCursorIcon() {
    const html = `<div style="
    width:22px;height:22px;
    background:radial-gradient(circle at 35% 35%,#80ffff,#00e5ff);
    border:2.5px solid white;
    border-radius:50%;
    box-shadow:0 0 20px rgba(0,229,255,0.8),0 0 40px rgba(0,229,255,0.4);
    animation:playback-pulse 1.2s ease-in-out infinite;
  "></div>`;
    return L.divIcon({ html, className: '', iconSize: [22, 22], iconAnchor: [11, 11] });
}

// --- User live location icon (blue Google Maps-style dot) ---
function createUserLocIcon() {
    const html = `<div class="user-loc-wrapper">
    <div class="user-loc-ring"></div>
    <div class="user-loc-dot"></div>
  </div>`;
    return L.divIcon({ html, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
}

const startIcon = createPinIcon('#10b981', 36, 'rgba(16,185,129,0.5)');
const endIcon = createPinIcon('#ef4444', 36, 'rgba(239,68,68,0.5)');
const waypointIcon = createPinIcon('#f59e0b', 30);
const hospitalIcon = createFacilityIcon('🏥', '#0ea5e9', 28);
const policeIcon = createFacilityIcon('👮', '#818cf8', 28);
const cursorIcon = createCursorIcon();
const userLocIcon = createUserLocIcon();

// ─── Styled custom Leaflet controls ──────────────────────────────────────────

function MapControls() {
    const map = useMap();

    useEffect(() => {
        // Style zoom controls
        const styleEl = document.createElement('style');
        styleEl.textContent = `
          .leaflet-control-zoom { 
            border:none!important; 
            box-shadow:0 4px 20px rgba(0,0,0,0.5)!important; 
            border-radius:12px!important; 
            overflow:hidden;
            backdrop-filter:blur(10px)!important;
          }
          .leaflet-control-zoom a { 
            background:rgba(10,15,35,0.85)!important; 
            color:#00e5ff!important; 
            border:none!important;
            border-bottom:1px solid rgba(255,255,255,0.08)!important;
            font-size:18px!important;
            font-weight:300!important;
            width:36px!important;
            height:36px!important;
            line-height:36px!important;
            transition:background 0.2s!important;
          }
          .leaflet-control-zoom a:hover { 
            background:rgba(0,229,255,0.15)!important; 
          }
          .leaflet-control-attribution { 
            background:rgba(5,10,25,0.7)!important; 
            color:rgba(255,255,255,0.35)!important; 
            font-size:10px!important; 
            padding:2px 8px!important; 
            border-radius:8px 0 0 0!important;
          }
          .leaflet-control-attribution a { color:rgba(0,229,255,0.6)!important; }
          .leaflet-popup-content-wrapper {
            background:rgba(8,14,32,0.95)!important;
            border:1px solid rgba(0,229,255,0.2)!important;
            border-radius:14px!important;
            box-shadow:0 8px 32px rgba(0,0,0,0.6),0 0 0 1px rgba(0,229,255,0.1)!important;
            color:#e2e8f0!important;
            backdrop-filter:blur(16px)!important;
            padding:0!important;
          }
          .leaflet-popup-content {
            margin:14px 16px!important;
            font-family:'Inter',sans-serif!important;
            font-size:13px!important;
          }
          .leaflet-popup-tip {
            background:rgba(8,14,32,0.95)!important;
          }
          .leaflet-popup-close-button {
            color:rgba(255,255,255,0.4)!important;
            font-size:18px!important;
            top:8px!important;
            right:10px!important;
          }
          .leaflet-popup-close-button:hover { color:#00e5ff!important; }
          @keyframes map-pulse {
            0%,100%{transform:scale(1);opacity:0.7;}
            50%{transform:scale(1.6);opacity:0;}
          }
        `;
        document.head.appendChild(styleEl);
        return () => document.head.removeChild(styleEl);
    }, []);

    return null;
}

// ─── Map Resizer (triggers invalidateSize on panel toggle) ────────────────────

function MapResizer({ panelHidden }) {
    const map = useMap();
    useEffect(() => {
        // Wait for the CSS transition to complete (350ms), then tell Leaflet to recalculate
        const timer = setTimeout(() => {
            map.invalidateSize({ animate: true });
        }, 380);
        return () => clearTimeout(timer);
    }, [panelHidden, map]);
    return null;
}

// ─── Auto-fit bounds ──────────────────────────────────────────────────────────

function FitBounds({ geometry, waypoints, hospitals, policeStations }) {
    const map = useMap();
    useEffect(() => {
        if (!geometry) return;
        const coords = geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const allPoints = [...coords];
        [waypoints, hospitals, policeStations].forEach((arr) => {
            arr?.forEach((p) => {
                const lat = p.latitude || p.lat;
                const lng = p.longitude || p.lng;
                if (lat && lng) allPoints.push([lat, lng]);
            });
        });
        if (allPoints.length > 0) {
            map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50], maxZoom: 14 });
        }
    }, [geometry, waypoints, hospitals, policeStations, map]);
    return null;
}

// ─── Route Playback Controller ────────────────────────────────────────────────

function RoutePlayback({ geometry, isPlaying, speed = 1, onProgress, onComplete }) {
    const map = useMap();
    const indexRef = useRef(0);
    const timerRef = useRef(null);

    const speedSettings = {
        1: { flyDuration: 1.2, interval: 2000 },
        2: { flyDuration: 0.7, interval: 1200 },
        3: { flyDuration: 0.4, interval: 700 },
    };

    const sampledCoords = useCallback(() => {
        if (!geometry?.coordinates) return [];
        const coords = geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const total = coords.length;
        if (total <= 60) return coords;
        const step = Math.max(1, Math.floor(total / 60));
        const sampled = [];
        for (let i = 0; i < total; i += step) sampled.push(coords[i]);
        const last = coords[total - 1];
        if (sampled[sampled.length - 1][0] !== last[0]) sampled.push(last);
        return sampled;
    }, [geometry]);

    useEffect(() => {
        if (!isPlaying) { if (timerRef.current) clearTimeout(timerRef.current); return; }
        const points = sampledCoords();
        if (points.length === 0) return;

        const settings = speedSettings[speed] || speedSettings[1];
        const lookAhead = speed === 3 ? 3 : 2;

        const animate = () => {
            const idx = indexRef.current;
            if (idx >= points.length) {
                indexRef.current = 0; onProgress(null); onComplete();
                map.flyToBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 14, duration: 1.2 });
                return;
            }
            onProgress(points[idx]);
            const segEnd = Math.min(idx + lookAhead, points.length - 1);
            const seg = [];
            for (let i = idx; i <= segEnd; i++) seg.push(points[i]);
            if (idx > 0) seg.push(points[idx - 1]);
            map.flyToBounds(L.latLngBounds(seg), { padding: [60, 60], maxZoom: 18, duration: settings.flyDuration, animate: true });
            indexRef.current = idx + 1;
            timerRef.current = setTimeout(animate, settings.interval);
        };
        animate();
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [isPlaying, speed, sampledCoords, map, onProgress, onComplete]);

    useEffect(() => { if (!isPlaying) indexRef.current = 0; }, [isPlaying]);
    return null;
}

// ─── Animated Route Drawing — progressive "snake" draw on map load ────────────

function AnimatedGlowRoute({ data }) {
    const map = useMap();
    const shadowRef = useRef(null);
    const outerRef = useRef(null);
    const coreRef = useRef(null);
    const animRef = useRef(null);
    const prevGeomRef = useRef(null);

    useEffect(() => {
        if (!data?.geometry?.coordinates) return;

        const geomKey = JSON.stringify(data.geometry.coordinates);
        // Don't re-animate if same route
        if (prevGeomRef.current === geomKey) return;
        prevGeomRef.current = geomKey;

        // Clean up previous lines
        [shadowRef, outerRef, coreRef].forEach((ref) => {
            if (ref.current) { map.removeLayer(ref.current); ref.current = null; }
        });
        if (animRef.current) cancelAnimationFrame(animRef.current);

        const fullCoords = data.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        if (fullCoords.length === 0) return;

        // Create three polyline layers (shadow → outer glow → core)
        shadowRef.current = L.polyline([], {
            color: '#00e5ff', weight: 14, opacity: 0.12,
            lineCap: 'round', lineJoin: 'round', interactive: false,
        }).addTo(map);

        outerRef.current = L.polyline([], {
            color: '#0af', weight: 8, opacity: 0.35,
            lineCap: 'round', lineJoin: 'round', interactive: false,
        }).addTo(map);

        coreRef.current = L.polyline([], {
            color: '#00e5ff', weight: 4, opacity: 0.95,
            lineCap: 'round', lineJoin: 'round', interactive: false,
        }).addTo(map);

        // Animation config
        const DURATION_MS = 2000;
        const totalPoints = fullCoords.length;
        let startTime = null;

        const tick = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / DURATION_MS, 1);

            // Ease-out cubic for a smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 3);

            const pointCount = Math.max(2, Math.floor(eased * totalPoints));
            const slice = fullCoords.slice(0, pointCount);

            shadowRef.current.setLatLngs(slice);
            outerRef.current.setLatLngs(slice);
            coreRef.current.setLatLngs(slice);

            if (progress < 1) {
                animRef.current = requestAnimationFrame(tick);
            }
        };

        // Small delay so map tiles load first
        const delayTimer = setTimeout(() => {
            animRef.current = requestAnimationFrame(tick);
        }, 400);

        return () => {
            clearTimeout(delayTimer);
            if (animRef.current) cancelAnimationFrame(animRef.current);
            [shadowRef, outerRef, coreRef].forEach((ref) => {
                if (ref.current) { map.removeLayer(ref.current); ref.current = null; }
            });
            // Reset so StrictMode re-mount (or route change) can re-draw
            prevGeomRef.current = null;
        };
    }, [data, map]);

    return null;
}

// ─── Click-to-Copy Coordinates ────────────────────────────────────────────────

function MapClickCopy() {
    const map = useMap();

    useEffect(() => {
        const handleClick = (e) => {
            const { lat, lng } = e.latlng;
            const latStr = lat.toFixed(6);
            const lngStr = lng.toFixed(6);
            const coordText = `${latStr}, ${lngStr}`;

            const popupContent = document.createElement('div');
            popupContent.className = 'coord-popup';
            popupContent.innerHTML = `
                <div class="coord-popup-label">📍 Coordinates</div>
                <div class="coord-popup-value">${latStr}, ${lngStr}</div>
                <button class="coord-copy-btn" title="Copy to clipboard">
                    <span class="coord-copy-icon">📋</span> Copy
                </button>
            `;

            const btn = popupContent.querySelector('.coord-copy-btn');
            btn.addEventListener('click', () => {
                navigator.clipboard.writeText(coordText).then(() => {
                    btn.innerHTML = '<span class="coord-copy-icon">✅</span> Copied!';
                    btn.classList.add('coord-copied');
                    setTimeout(() => {
                        btn.innerHTML = '<span class="coord-copy-icon">📋</span> Copy';
                        btn.classList.remove('coord-copied');
                    }, 1800);
                }).catch(() => {
                    // Fallback for older browsers
                    const ta = document.createElement('textarea');
                    ta.value = coordText;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    btn.innerHTML = '<span class="coord-copy-icon">✅</span> Copied!';
                    btn.classList.add('coord-copied');
                    setTimeout(() => {
                        btn.innerHTML = '<span class="coord-copy-icon">📋</span> Copy';
                        btn.classList.remove('coord-copied');
                    }, 1800);
                });
            });

            L.popup({
                className: 'coord-leaflet-popup',
                closeButton: true,
                maxWidth: 220,
            })
                .setLatLng(e.latlng)
                .setContent(popupContent)
                .openOn(map);
        };

        map.on('click', handleClick);
        return () => map.off('click', handleClick);
    }, [map]);

    return null;
}

// ─── Live GPS Tracker ─────────────────────────────────────────────────────────

function LiveTracker({ isNavigating }) {
    const map = useMap();
    const [userPos, setUserPos] = useState(null);
    const [accuracy, setAccuracy] = useState(0);
    const watchRef = useRef(null);

    useEffect(() => {
        if (!isNavigating) {
            if (watchRef.current !== null) {
                navigator.geolocation.clearWatch(watchRef.current);
                watchRef.current = null;
            }
            setUserPos(null);
            return;
        }

        if (!navigator.geolocation) return;

        watchRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, accuracy: acc } = pos.coords;
                const latlng = [latitude, longitude];
                setUserPos(latlng);
                setAccuracy(acc || 30);
                map.flyTo(latlng, Math.max(map.getZoom(), 17), {
                    duration: 0.8,
                    animate: true,
                });
            },
            (err) => console.warn('Geolocation error:', err.message),
            {
                enableHighAccuracy: true,
                maximumAge: 2000,
                timeout: 10000,
            }
        );

        return () => {
            if (watchRef.current !== null) {
                navigator.geolocation.clearWatch(watchRef.current);
                watchRef.current = null;
            }
        };
    }, [isNavigating, map]);

    if (!userPos) return null;

    return (
        <>
            {/* Accuracy circle */}
            <Circle
                center={userPos}
                radius={accuracy}
                pathOptions={{
                    color: '#4285f4',
                    weight: 1,
                    fillColor: '#4285f4',
                    fillOpacity: 0.12,
                }}
            />
            {/* User position dot */}
            <Marker position={userPos} icon={userLocIcon}>
                <Popup>
                    <div className="map-popup-title">📍 You are here</div>
                    <div className="map-popup-sub">GPS accuracy: ~{Math.round(accuracy)}m</div>
                </Popup>
            </Marker>
        </>
    );
}

// ─── Main MapView ─────────────────────────────────────────────────────────────

export default function MapView({ routeData, isPlaying, playbackSpeed = 1, isNavigating = false, onPlaybackComplete, panelHidden }) {
    const [cursorPos, setCursorPos] = useState(null);
    const handleProgress = useCallback((pos) => setCursorPos(pos), []);
    const handleComplete = useCallback(() => { setCursorPos(null); if (onPlaybackComplete) onPlaybackComplete(); }, [onPlaybackComplete]);

    if (!routeData) {
        return (
            <div className="map-placeholder">
                <div className="placeholder-icon">🛰️</div>
                <p>Enter a start and destination to generate your safe route</p>
            </div>
        );
    }

    const { route, waypoints, hospitals, policeStations } = routeData;
    const geometry = route?.geometry;
    if (!geometry) return (
        <div className="map-placeholder">
            <div className="placeholder-icon">⚠️</div>
            <p>No route geometry available</p>
        </div>
    );

    const coords = geometry.coordinates;
    const startPos = [coords[0][1], coords[0][0]];
    const endPos = [coords[coords.length - 1][1], coords[coords.length - 1][0]];

    return (
        <div className="map-container">
            <MapContainer center={startPos} zoom={7} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                {/* Satellite base */}
                <TileLayer
                    attribution='Tiles &copy; Esri'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                />
                {/* Labels overlay */}
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                />

                <MapControls />
                <FitBounds geometry={geometry} waypoints={waypoints} hospitals={hospitals} policeStations={policeStations} />
                <RoutePlayback geometry={geometry} isPlaying={isPlaying} speed={playbackSpeed} onProgress={handleProgress} onComplete={handleComplete} />
                <LiveTracker isNavigating={isNavigating} />
                <MapResizer panelHidden={panelHidden} />
                <MapClickCopy />

                {/* Animated glowing route line (draws progressively) */}
                <AnimatedGlowRoute data={route} />

                {/* Moving playback cursor */}
                {cursorPos && <Marker position={cursorPos} icon={cursorIcon} />}

                {/* Start marker */}
                <Marker position={startPos} icon={startIcon}>
                    <Popup>
                        <div className="map-popup-title">🟢 Start</div>
                        <div className="map-popup-sub">Origin of your safe route</div>
                    </Popup>
                </Marker>

                {/* End marker */}
                <Marker position={endPos} icon={endIcon}>
                    <Popup>
                        <div className="map-popup-title">🔴 Destination</div>
                        <div className="map-popup-sub">Journey endpoint</div>
                    </Popup>
                </Marker>

                {/* Safe waypoints */}
                {waypoints?.map((wp, i) => (
                    <Marker key={`wp-${i}`} position={[wp.latitude, wp.longitude]} icon={waypointIcon}>
                        <Popup maxWidth={280}>
                            <div className="map-popup-title">🛡️ {wp.name}</div>
                            <div className="map-popup-row"><span>🏥</span><span><b>Hospital:</b> {wp.nearest_hospital}</span></div>
                            <div className="map-popup-row"><span>👮</span><span><b>Police:</b> {wp.nearest_police_station}</span></div>
                            <div className="map-popup-row"><span>📏</span><span><b>Distance:</b> ~{wp.approx_distance_from_start_km} km from start</span></div>
                            <div className="map-popup-reason">"{wp.reason}"</div>
                        </Popup>
                    </Marker>
                ))}

                {/* Hospitals */}
                {hospitals?.map((h, i) => (
                    <Marker key={`hosp-${i}`} position={[h.latitude, h.longitude]} icon={hospitalIcon}>
                        <Popup>
                            <div className="map-popup-title">🏥 {h.name}</div>
                            {h.distance && <div className="map-popup-row"><span>📏</span><span>{(h.distance / 1000).toFixed(1)} km from route</span></div>}
                        </Popup>
                    </Marker>
                ))}

                {/* Police stations */}
                {policeStations?.map((p, i) => (
                    <Marker key={`pol-${i}`} position={[p.latitude, p.longitude]} icon={policeIcon}>
                        <Popup>
                            <div className="map-popup-title">👮 {p.name}</div>
                            {p.distance && <div className="map-popup-row"><span>📏</span><span>{(p.distance / 1000).toFixed(1)} km from route</span></div>}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
