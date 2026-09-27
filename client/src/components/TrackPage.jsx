/**
 * TrackPage — Premium live location tracking page
 * Shows real-time position of a navigator on a satellite map with their route.
 * Viewer can generate a route from their own location to the navigator.
 * URL: /track/:sessionId
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

const API_URL =
    import.meta.env.VITE_API_URL || 'https://navix-s9yb.onrender.com';

// ── Marker Icons ─────────────────────────────────────────────

function createPinIcon(color, size = 36, pulseColor = null) {
    const pulse = pulseColor
        ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${pulseColor};animation:map-pulse 2s ease-in-out infinite;opacity:0.7;pointer-events:none;"></div>`
        : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 12}" viewBox="0 0 ${size} ${size + 12}">
    <defs>
      <radialGradient id="tpg${color.replace('#', '')}" cx="40%" cy="30%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.5)"/>
        <stop offset="100%" stop-color="${color}"/>
      </radialGradient>
      <filter id="tps${color.replace('#', '')}">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="${color}" flood-opacity="0.6"/>
        <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.4)"/>
      </filter>
    </defs>
    <path d="M${size / 2} 0C${size * 0.22} 0 0 ${size * 0.22} 0 ${size / 2}c0 ${size * 0.375} ${size / 2} ${size * 0.43} ${size / 2} ${size * 0.43}S${size} ${size * 0.875} ${size} ${size / 2}C${size} ${size * 0.22} ${size * 0.78} 0 ${size / 2} 0z"
      fill="url(#tpg${color.replace('#', '')})" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" filter="url(#tps${color.replace('#', '')})"/>
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

function createLiveIcon() {
    const html = `<div class="track-live-marker">
        <div class="track-live-marker-ring"></div>
        <div class="track-live-marker-dot"></div>
    </div>`;
    return L.divIcon({ html, className: '', iconSize: [40, 40], iconAnchor: [20, 20] });
}

function createViewerIcon() {
    const html = `<div class="track-viewer-marker">
        <div class="track-viewer-marker-dot"></div>
    </div>`;
    return L.divIcon({ html, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
}

const startIcon = createPinIcon('#10b981', 36, 'rgba(16,185,129,0.5)');
const endIcon = createPinIcon('#ef4444', 36, 'rgba(239,68,68,0.5)');
const liveIcon = createLiveIcon();
const viewerIcon = createViewerIcon();

// ── Map Helpers ────────────────────────────────────────

function FitToRoute({ geometry }) {
    const map = useMap();
    useEffect(() => {
        if (!geometry?.coordinates?.length) return;
        const coords = geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        if (coords.length > 0) {
            map.fitBounds(L.latLngBounds(coords), { padding: [50, 50], maxZoom: 14 });
        }
    }, [geometry, map]);
    return null;
}

function FitToBounds({ points }) {
    const map = useMap();
    useEffect(() => {
        if (!points || points.length < 2) return;
        map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 15, duration: 1 });
    }, [points, map]);
    return null;
}

function FollowLive({ position }) {
    const map = useMap();
    useEffect(() => {
        if (!position) return;
        map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 16), {
            duration: 1.2,
            animate: true,
        });
    }, [position, map]);
    return null;
}

function GlowRoute({ geometry }) {
    if (!geometry) return null;
    const feature = { type: 'Feature', geometry, properties: {} };
    const key = JSON.stringify(geometry).slice(0, 80);
    return (
        <>
            <GeoJSON key={key + 'sh'} data={feature} style={{ color: '#00e5ff', weight: 14, opacity: 0.12, lineCap: 'round', lineJoin: 'round' }} />
            <GeoJSON key={key + 'out'} data={feature} style={{ color: '#0af', weight: 8, opacity: 0.35, lineCap: 'round', lineJoin: 'round' }} />
            <GeoJSON key={key + 'core'} data={feature} style={{ color: '#00e5ff', weight: 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} />
        </>
    );
}

function MapStyles() {
    useEffect(() => {
        const styleEl = document.createElement('style');
        styleEl.textContent = `
          @keyframes map-pulse{0%,100%{transform:scale(1);opacity:0.7}50%{transform:scale(1.6);opacity:0}}
          .leaflet-control-zoom{border:none!important;box-shadow:0 4px 20px rgba(0,0,0,0.5)!important;border-radius:12px!important;overflow:hidden;backdrop-filter:blur(10px)!important;}
          .leaflet-control-zoom a{background:rgba(10,15,35,0.85)!important;color:#00e5ff!important;border:none!important;border-bottom:1px solid rgba(255,255,255,0.08)!important;width:36px!important;height:36px!important;line-height:36px!important;font-size:18px!important;font-weight:300!important;transition:background 0.2s!important;}
          .leaflet-control-zoom a:hover{background:rgba(0,229,255,0.15)!important;}
          .leaflet-control-attribution{background:rgba(5,10,25,0.7)!important;color:rgba(255,255,255,0.35)!important;font-size:10px!important;padding:2px 8px!important;border-radius:8px 0 0 0!important;}
          .leaflet-control-attribution a{color:rgba(0,229,255,0.6)!important;}
          .leaflet-popup-content-wrapper{background:rgba(8,14,32,0.95)!important;border:1px solid rgba(0,229,255,0.2)!important;border-radius:14px!important;box-shadow:0 8px 32px rgba(0,0,0,0.6),0 0 0 1px rgba(0,229,255,0.1)!important;color:#e2e8f0!important;backdrop-filter:blur(16px)!important;padding:0!important;}
          .leaflet-popup-content{margin:14px 16px!important;font-family:'Inter',sans-serif!important;font-size:13px!important;}
          .leaflet-popup-tip{background:rgba(8,14,32,0.95)!important;}
          .leaflet-popup-close-button{color:rgba(255,255,255,0.4)!important;font-size:18px!important;top:8px!important;right:10px!important;}
          .leaflet-popup-close-button:hover{color:#00e5ff!important;}
        `;
        document.head.appendChild(styleEl);
        return () => document.head.removeChild(styleEl);
    }, []);
    return null;
}

// ── Elapsed Timer Hook ────────────────────────────────

function useElapsed(startTime) {
    const [elapsed, setElapsed] = useState('');
    useEffect(() => {
        if (!startTime) return;
        const tick = () => {
            const diff = Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;
            setElapsed(h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [startTime]);
    return elapsed;
}

// ── Main TrackPage ────────────────────────────────────

export default function TrackPage() {
    const { sessionId } = useParams();
    const [session, setSession] = useState(null);
    const [livePos, setLivePos] = useState(null);
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [followMode, setFollowMode] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [panelCollapsed, setPanelCollapsed] = useState(false);
    const socketRef = useRef(null);

    // Navigate-to-them state
    const [viewerPos, setViewerPos] = useState(null);
    const [navRoute, setNavRoute] = useState(null);
    const [navLoading, setNavLoading] = useState(false);
    const [navError, setNavError] = useState(null);

    const elapsed = useElapsed(session?.createdAt);

    // Fetch session info
    useEffect(() => {
        async function fetchSession() {
            try {
                const res = await axios.get(`${API_URL}/api/live/${sessionId}`);
                setSession(res.data);
                setIsActive(res.data.isActive);
                if (res.data.lastLocation?.lat) {
                    setLivePos(res.data.lastLocation);
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Session not found or expired.');
            } finally {
                setLoading(false);
            }
        }
        fetchSession();
    }, [sessionId]);

    // Connect to Socket.IO
    useEffect(() => {
        if (!session || !isActive) return;

        const socket = io(API_URL, {
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join-session', sessionId);
        });

        socket.on('location-update', (data) => {
            setLivePos({ lat: data.lat, lng: data.lng });
            setLastUpdate(new Date(data.timestamp));
        });

        socket.on('session-ended', () => {
            setIsActive(false);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [session, sessionId, isActive]);

    // ── Navigate to them ──
    const handleNavigateToThem = async () => {
        if (!livePos || navLoading) return;
        setNavLoading(true);
        setNavError(null);
        setNavRoute(null);

        try {
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                });
            });

            const myLat = pos.coords.latitude;
            const myLng = pos.coords.longitude;
            setViewerPos({ lat: myLat, lng: myLng });
            setFollowMode(false);

            const res = await axios.post(`${API_URL}/api/route`, {
                start: `${myLat}, ${myLng}`,
                end: `${livePos.lat}, ${livePos.lng}`,
                profile: 'driving-car',
            });

            setNavRoute({
                geometry: res.data.route?.geometry || null,
                distance: res.data.distance,
                duration: res.data.duration,
            });
        } catch (err) {
            if (err.code) {
                setNavError('Enable location access to navigate.');
            } else {
                setNavError(err.response?.data?.error || 'Failed to generate route.');
            }
        } finally {
            setNavLoading(false);
        }
    };

    const clearNavRoute = () => {
        setNavRoute(null);
        setViewerPos(null);
        setNavError(null);
    };

    const formatDist = (m) => {
        if (!m) return '—';
        const km = m / 1000;
        return km >= 100 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
    };

    const formatDur = (s) => {
        if (!s) return '—';
        const hrs = Math.floor(s / 3600);
        const mins = Math.round((s % 3600) / 60);
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return `${mins} min`;
    };

    const formatTime = (date) => {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    // ── Loading ──
    if (loading) {
        return (
            <div className="track-page">
                <div className="track-loading">
                    <div className="track-loading-anim">
                        <div className="track-loading-ring" />
                        <div className="track-loading-ring track-loading-ring-2" />
                        <div className="track-loading-icon">📡</div>
                    </div>
                    <p className="track-loading-text">Connecting to live session...</p>
                    <p className="track-loading-sub">Session: {sessionId}</p>
                </div>
            </div>
        );
    }

    // ── Error ──
    if (error) {
        return (
            <div className="track-page">
                <div className="track-error-page">
                    <div className="track-error-glow" />
                    <div className="track-error-icon">📡</div>
                    <h2>Session Not Found</h2>
                    <p>{error}</p>
                    <a href="/" className="track-home-btn">
                        <span>🧭</span> Open NaviX
                    </a>
                </div>
            </div>
        );
    }

    const geometry = session.routeGeometry;
    const coords = geometry?.coordinates;
    const startPos = coords?.length ? [coords[0][1], coords[0][0]] : null;
    const endPos = coords?.length ? [coords[coords.length - 1][1], coords[coords.length - 1][0]] : null;
    const center = livePos ? [livePos.lat, livePos.lng] : startPos || [20.5937, 78.9629];

    const navRouteCoords = navRoute?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || [];
    const fitNavPoints = viewerPos && livePos
        ? [[viewerPos.lat, viewerPos.lng], [livePos.lat, livePos.lng]]
        : null;

    return (
        <div className="track-page">
            {/* ── Full-Screen Map (base layer) ── */}
            <div className="track-map-wrap">
                <MapContainer center={center} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='Tiles &copy; Esri'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        maxZoom={19}
                    />
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                        maxZoom={19}
                    />

                    <MapStyles />
                    {geometry && !navRoute && <FitToRoute geometry={geometry} />}
                    {followMode && livePos && !navRoute && <FollowLive position={livePos} />}
                    {navRoute && fitNavPoints && <FitToBounds points={fitNavPoints} />}

                    {geometry && <GlowRoute geometry={geometry} />}

                    {navRouteCoords.length > 0 && (
                        <>
                            <Polyline positions={navRouteCoords} pathOptions={{ color: '#f59e0b', weight: 12, opacity: 0.12, lineCap: 'round', lineJoin: 'round' }} />
                            <Polyline positions={navRouteCoords} pathOptions={{ color: '#f59e0b', weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round', dashArray: '14, 10' }} />
                        </>
                    )}

                    {startPos && (
                        <Marker position={startPos} icon={startIcon}>
                            <Popup><div style={{ fontWeight: 700 }}>🟢 Start</div><div style={{ fontSize: '0.85em', color: '#94a3b8' }}>{session.startName}</div></Popup>
                        </Marker>
                    )}

                    {endPos && (
                        <Marker position={endPos} icon={endIcon}>
                            <Popup><div style={{ fontWeight: 700 }}>🔴 Destination</div><div style={{ fontSize: '0.85em', color: '#94a3b8' }}>{session.endName}</div></Popup>
                        </Marker>
                    )}

                    {viewerPos && (
                        <Marker position={[viewerPos.lat, viewerPos.lng]} icon={viewerIcon}>
                            <Popup><div style={{ fontWeight: 700 }}>📍 Your location</div></Popup>
                        </Marker>
                    )}

                    {livePos && (
                        <>
                            <Circle
                                center={[livePos.lat, livePos.lng]}
                                radius={50}
                                pathOptions={{ color: '#4285f4', weight: 1, fillColor: '#4285f4', fillOpacity: 0.1 }}
                            />
                            <Marker position={[livePos.lat, livePos.lng]} icon={liveIcon}>
                                <Popup>
                                    <div style={{ fontWeight: 700 }}>📍 {session.username}'s location</div>
                                    {lastUpdate && <div style={{ fontSize: '0.8em', color: '#94a3b8' }}>Updated: {formatTime(lastUpdate)}</div>}
                                </Popup>
                            </Marker>
                        </>
                    )}
                </MapContainer>
            </div>

            {/* ── Floating Panel (overlay) ── */}
            <div className={`track-panel ${panelCollapsed ? 'track-panel-collapsed' : 'track-panel-expanded'}`}>
                <div className="track-minibar" onClick={() => setPanelCollapsed(c => !c)}>
                    <div className="track-minibar-drag" />
                    <div className="track-minibar-content">
                        <div className="track-minibar-left">
                            <div className="track-minibar-avatar">
                                {session.username?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="track-minibar-info">
                                <span className="track-minibar-name">{session.username}</span>
                                <span className="track-minibar-sub">
                                    {isActive ? 'Sharing live location' : 'Session ended'}
                                </span>
                            </div>
                        </div>
                        <div className="track-minibar-right">
                            <div className={`track-badge ${isActive ? 'track-badge-live' : 'track-badge-ended'}`}>
                                <span className="track-badge-dot" />
                                {isActive ? 'LIVE' : 'ENDED'}
                            </div>
                            <span className="track-minibar-chevron">
                                {panelCollapsed ? '▼' : '▲'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="track-panel-body">
                    <div className="track-panel-inner">
                        <div className="track-header">
                            <a href="/" className="track-brand">
                                <img src="/logo.png" alt="NaviX" className="track-logo" />
                                <span className="track-brand-name">NaviX</span>
                            </a>
                        </div>

                        <div className="track-route-card">
                            <div className="track-route-visual">
                                <div className="track-route-dots">
                                    <div className="track-route-dot-start" />
                                    <div className="track-route-line" />
                                    <div className="track-route-dot-end" />
                                </div>
                                <div className="track-route-labels">
                                    <span className="track-route-label">{session.startName}</span>
                                    <span className="track-route-label">{session.endName}</span>
                                </div>
                            </div>
                        </div>

                        <div className="track-stat-grid">
                            <div className="track-stat">
                                <span className="track-stat-label">Distance</span>
                                <span className="track-stat-value">{formatDist(session.distance)}</span>
                            </div>
                            <div className="track-stat">
                                <span className="track-stat-label">Duration</span>
                                <span className="track-stat-value">{formatDur(session.duration)}</span>
                            </div>
                            <div className="track-stat">
                                <span className="track-stat-label">Elapsed</span>
                                <span className="track-stat-value">{elapsed || '—'}</span>
                            </div>
                            <div className="track-stat">
                                <span className="track-stat-label">Last Update</span>
                                <span className="track-stat-value">{lastUpdate ? formatTime(lastUpdate) : '—'}</span>
                            </div>
                        </div>

                        {!isActive && (
                            <div className="track-ended-card">
                                <div className="track-ended-icon">⏹</div>
                                <span>Location sharing has ended</span>
                            </div>
                        )}

                        {navRoute && (
                            <div className="track-nav-card">
                                <div className="track-nav-card-head">
                                    <span className="track-nav-card-title">🧭 Your route to {session.username}</span>
                                    <button className="track-nav-dismiss" onClick={clearNavRoute}>✕</button>
                                </div>
                                <div className="track-nav-card-stats">
                                    <div className="track-nav-pill">📏 {formatDist(navRoute.distance)}</div>
                                    <div className="track-nav-pill">⏱️ {formatDur(navRoute.duration)}</div>
                                </div>
                            </div>
                        )}

                        {navError && (
                            <div className="track-nav-error-card">{navError}</div>
                        )}

                        <div className="track-divider" />
                        <div className="track-actions">
                            <button
                                className={`track-action-btn ${followMode ? 'track-action-active' : ''}`}
                                onClick={() => setFollowMode(f => !f)}
                            >
                                <span className="track-action-icon">{followMode ? '📍' : '🗺️'}</span>
                                <span>{followMode ? 'Following' : 'Free View'}</span>
                            </button>

                            {livePos && (
                                <button
                                    className={`track-action-btn track-action-nav ${navRoute ? 'track-action-active-amber' : ''}`}
                                    onClick={navRoute ? clearNavRoute : handleNavigateToThem}
                                    disabled={navLoading}
                                >
                                    {navLoading ? (
                                        <><span className="spinner" style={{ width: 14, height: 14 }} /> Routing...</>
                                    ) : navRoute ? (
                                        <><span className="track-action-icon">✕</span><span>Clear Route</span></>
                                    ) : (
                                        <><span className="track-action-icon">🧭</span><span>Navigate to them</span></>
                                    )}
                                </button>
                            )}
                        </div>

                        <div className="track-footer">
                            Powered by <strong>NaviX</strong> · Safe Navigation
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
