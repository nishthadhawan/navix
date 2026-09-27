/**
 * RoutePage Component
 * Full-page route navigation view — premium responsive layout.
 * Shows the satellite map with route, hospitals, police, waypoints.
 * Has "Show Route" playback, "Navigate", "End Navigation", "Save", and "Live Share" buttons.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import MapView from './MapView';
import DirectionsPanel from './DirectionsPanel';
import FeedbackForm from './FeedbackForm';
import NaviXChat from './NaviXChat';
import { useAuth } from '../context/AuthContext';
import useShakeDetect from '../hooks/useShakeDetect';
import Icons from './Icons';

const API_URL =
    import.meta.env.VITE_API_URL || 'https://navix-backend-uly4.onrender.com';

export default function RoutePage() {
    const navigate = useNavigate();
    const [routeData, setRouteData] = useState(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [aiWarning, setAiWarning] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [isNavigating, setIsNavigating] = useState(false);
    const [panelHidden, setPanelHidden] = useState(false);
    const [mobileStatsOpen, setMobileStatsOpen] = useState(false);
    const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error | limit
    const [liveShareActive, setLiveShareActive] = useState(false);
    const [liveSessionId, setLiveSessionId] = useState(null);
    const [liveShareLoading, setLiveShareLoading] = useState(false);
    const [liveShareCopied, setLiveShareCopied] = useState(false);
    const socketRef = useRef(null);
    const gpsWatchRef = useRef(null);
    const { user } = useAuth();

    // ── Emergency Contact ──
    const [emergencyPhone, setEmergencyPhone] = useState(null);
    const [shakeEnabled, setShakeEnabled] = useState(false);

    useEffect(() => {
        if (!user) return;
        const fetchEmergency = async () => {
            try {
                const token = localStorage.getItem('navix_token');
                const res = await axios.get(`${API_URL}/api/emergency`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.data.phone) {
                    setEmergencyPhone(res.data.phone);
                    setShakeEnabled(res.data.shakeEnabled || false);
                }
            } catch {
                // No emergency contact saved
            }
        };
        fetchEmergency();
    }, [user]);

    const triggerEmergencyCall = useCallback(() => {
        if (emergencyPhone) {
            window.location.href = `tel:${emergencyPhone}`;
        }
    }, [emergencyPhone]);

    useShakeDetect(shakeEnabled && !!emergencyPhone, triggerEmergencyCall);

    // Load route data from sessionStorage on mount
    useEffect(() => {
        try {
            const stored = sessionStorage.getItem('safeRouteData');
            if (stored) {
                const data = JSON.parse(stored);
                setRouteData(data);
                if (data.aiError) {
                    setAiWarning(data.aiError);
                }
            } else {
                navigate('/', { replace: true });
            }
        } catch (err) {
            console.error('Failed to load route data:', err);
            navigate('/', { replace: true });
        }
    }, [navigate]);

    const formatDistance = (meters) => {
        if (!meters) return '—';
        const km = meters / 1000;
        return km >= 100 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
    };

    // ── Update browser tab title with route distance ──
    useEffect(() => {
        if (routeData?.distance) {
            const dist = formatDistance(routeData.distance);
            document.title = `${dist} Route | NaviX`;
        }
        return () => { document.title = 'NaviX — Smart Safe Navigation'; };
    }, [routeData]);

    const formatDuration = (seconds) => {
        if (!seconds) return '—';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.round((seconds % 3600) / 60);
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return `${mins} min`;
    };

    const formatETA = (seconds) => {
        if (!seconds) return '—';
        const eta = new Date(Date.now() + seconds * 1000);
        return eta.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    const handleEndNavigation = () => {
        setIsPlaying(false);
        setIsNavigating(false);
        setShowFeedback(true);
    };

    const handleToggleNavigate = () => {
        setIsNavigating((prev) => {
            if (!prev) setIsPlaying(false);
            return !prev;
        });
    };

    const handleFeedbackDone = () => {
        window.close();
    };

    const handleTogglePlayback = () => {
        setIsPlaying((prev) => !prev);
    };

    const handlePlaybackComplete = () => {
        setIsPlaying(false);
        setPlaybackSpeed(1);
    };

    const cycleSpeed = () => {
        setPlaybackSpeed((prev) => (prev >= 3 ? 1 : prev + 1));
    };

    const handleSaveRoute = async () => {
        if (!user || !routeData || saveStatus === 'saving' || saveStatus === 'saved') return;
        setSaveStatus('saving');
        try {
            const token = localStorage.getItem('navix_token');
            // Route API returns coords as [lon, lat] arrays; convert to "lat,lon" strings
            const sc = routeData.startCoords;
            const ec = routeData.endCoords;
            const startCoords = Array.isArray(sc) ? `${sc[1]},${sc[0]}` : (sc || '');
            const endCoords = Array.isArray(ec) ? `${ec[1]},${ec[0]}` : (ec || '');
            await axios.post(`${API_URL}/api/saved-routes`, {
                startName: routeData.startName || routeData.start || 'Start',
                endName: routeData.endName || routeData.end || 'End',
                startCoords,
                endCoords,
                profile: routeData.travelProfile || routeData.profile || 'driving-car',
                distance: routeData.distance || 0,
                duration: routeData.duration || 0,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSaveStatus('saved');
        } catch (err) {
            if (err.response?.data?.limitReached) {
                setSaveStatus('limit');
            } else {
                setSaveStatus('error');
            }
            setTimeout(() => setSaveStatus('idle'), 3500);
        }
    };

    // ── Live Share Logic ──

    const startLiveShare = async () => {
        if (!user || !routeData || liveShareLoading) return;
        setLiveShareLoading(true);
        try {
            const token = localStorage.getItem('navix_token');
            const res = await axios.post(`${API_URL}/api/live/start`, {
                startName: routeData.startName || 'Start',
                endName: routeData.endName || 'End',
                routeGeometry: routeData.route?.geometry || null,
                distance: routeData.distance || 0,
                duration: routeData.duration || 0,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const sid = res.data.sessionId;
            setLiveSessionId(sid);
            setLiveShareActive(true);

            // Connect Socket.IO
            const socket = io(API_URL, { transports: ['websocket', 'polling'] });
            socketRef.current = socket;

            socket.on('connect', () => {
                socket.emit('join-session', sid);
            });

            // Watch GPS and emit location every update
            if (navigator.geolocation) {
                gpsWatchRef.current = navigator.geolocation.watchPosition(
                    (pos) => {
                        const { latitude, longitude } = pos.coords;
                        socket.emit('location-update', {
                            sessionId: sid,
                            lat: latitude,
                            lng: longitude,
                        });
                    },
                    (err) => console.warn('GPS error:', err.message),
                    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
                );
            }
        } catch (err) {
            console.error('Failed to start live share:', err);
        } finally {
            setLiveShareLoading(false);
        }
    };

    const stopLiveShare = async () => {
        try {
            // Broadcast session ended
            if (socketRef.current && liveSessionId) {
                socketRef.current.emit('session-ended', liveSessionId);
            }

            // Stop GPS
            if (gpsWatchRef.current !== null) {
                navigator.geolocation.clearWatch(gpsWatchRef.current);
                gpsWatchRef.current = null;
            }

            // Disconnect socket
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }

            // Tell server
            const token = localStorage.getItem('navix_token');
            await axios.post(`${API_URL}/api/live/stop`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch (err) {
            console.error('Failed to stop live share:', err);
        } finally {
            setLiveShareActive(false);
            setLiveSessionId(null);
            setLiveShareCopied(false);
        }
    };

    const copyLiveLink = async () => {
        const origin = window.location.origin;
        const link = `${origin}/track/${liveSessionId}`;
        const startName = routeData?.startName || routeData?.start || 'Start';
        const endName = routeData?.endName || routeData?.end || 'End';
        const dist = routeData?.distance ? (routeData.distance / 1000).toFixed(1) + ' km' : '';
        const dur = routeData?.duration ? Math.round(routeData.duration / 60) + ' min' : '';
        const stats = [dist, dur].filter(Boolean).join(' · ');

        const shareText = [
            `🧭 NaviX — Safe Navigation`,
            ``,
            `📍 Track my trip`,
            `${startName} → ${endName}`,
            stats ? stats : null,
            ``,
            `🟢 Live · Tap to follow in real-time`,
            link,
        ].filter(Boolean).join('\n');

        try {
            if (navigator.share) {
                await navigator.share({ title: `Track my trip — ${startName} → ${endName}`, text: shareText });
            } else {
                await navigator.clipboard.writeText(shareText);
            }
            setLiveShareCopied(true);
            setTimeout(() => setLiveShareCopied(false), 3000);
        } catch (err) {
            // User cancelled
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (gpsWatchRef.current !== null) {
                navigator.geolocation.clearWatch(gpsWatchRef.current);
            }
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    if (!routeData) {
        return (
            <div className="route-page">
                <div className="route-skeleton">
                    {/* ── Skeleton Top Bar ── */}
                    <div className="route-skel-topbar">
                        <div className="route-skel-topbar-left">
                            <div className="skel skel-circle route-skel-logo" />
                            <div className="skel route-skel-brand" />
                            <div className="route-skel-stats">
                                <div className="route-skel-stat">
                                    <div className="skel skel-circle route-skel-stat-icon" />
                                    <div className="skel route-skel-stat-text" style={{ width: 52 }} />
                                </div>
                                <div className="route-skel-stat">
                                    <div className="skel skel-circle route-skel-stat-icon" />
                                    <div className="skel route-skel-stat-text" style={{ width: 76 }} />
                                </div>
                                <div className="route-skel-stat">
                                    <div className="skel skel-circle route-skel-stat-icon" />
                                    <div className="skel route-skel-stat-text" style={{ width: 64 }} />
                                </div>
                            </div>
                        </div>
                        <div className="route-skel-topbar-right">
                            <div className="skel route-skel-btn" style={{ width: 90 }} />
                            <div className="skel route-skel-btn" style={{ width: 80 }} />
                            <div className="skel route-skel-btn" style={{ width: 70 }} />
                        </div>
                    </div>

                    {/* ── Skeleton Body (Map + Panel) ── */}
                    <div className="route-skel-body">
                        <div className="route-skel-map">
                            <div className="route-skel-marker start" />
                            <div className="route-skel-marker mid" />
                            <div className="route-skel-marker end" />
                            <div className="route-skel-zoom">
                                <div className="route-skel-zoom-btn" />
                                <div className="route-skel-zoom-btn" />
                            </div>
                            <div className="route-skel-label">
                                <div className="spinner" />
                                <span>Loading route data…</span>
                            </div>
                        </div>

                        {/* Skeleton Side Panel */}
                        <div className="route-skel-panel">
                            <div className="skel route-skel-panel-title" />
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div className="route-skel-direction" key={i}>
                                    <div className="skel skel-circle route-skel-dir-icon" />
                                    <div className="route-skel-dir-lines">
                                        <div className="skel route-skel-dir-line" style={{ width: `${85 - i * 8}%` }} />
                                        <div className="skel route-skel-dir-line" style={{ width: `${60 - i * 5}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="route-page">
            {/* Top Control Bar */}
            <div className="route-topbar">
                <div className="route-topbar-left">
                    <a href="https://navix-frontend.onrender.com/" className="route-topbar-brand">
                        <img src="/logo.png" alt="NaviX" className="route-topbar-logo" />
                        <span className="route-topbar-name">NaviX</span>
                    </a>

                    {/* Desktop stats (always visible) */}
                    <div className="route-topbar-stats desktop-stats">
                        <span className="topbar-stat">
                            <span className="topbar-stat-icon">📏</span>
                            <span className="topbar-stat-value">{formatDistance(routeData.distance)}</span>
                        </span>
                        <span className="topbar-stat">
                            <span className="topbar-stat-icon">⏱️</span>
                            <span className="topbar-stat-value">Arrive by {formatETA(routeData.duration)} ({formatDuration(routeData.duration)})</span>
                        </span>
                        <span className="topbar-stat">
                            <span className="topbar-stat-icon">🛡️</span>
                            <span className="topbar-stat-value">{routeData.waypoints?.length || 0} safe stops</span>
                        </span>
                        <span className="topbar-stat">
                            <span className="topbar-stat-icon">🏥</span>
                            <span className="topbar-stat-value">{routeData.hospitals?.length || 0} hospitals</span>
                        </span>
                        <span className="topbar-stat">
                            <span className="topbar-stat-icon">👮</span>
                            <span className="topbar-stat-value">{routeData.policeStations?.length || 0} police</span>
                        </span>
                    </div>

                    {/* Mobile compact stats bar */}
                    <div className="mobile-stats-bar">
                        <span className="mobile-stat-pill">
                            📏 {formatDistance(routeData.distance)}
                        </span>
                        <span className="mobile-stat-pill">
                            ⏱️ Arrive {formatETA(routeData.duration)} ({formatDuration(routeData.duration)})
                        </span>
                        <button
                            className="mobile-stats-toggle"
                            onClick={() => setMobileStatsOpen(p => !p)}
                        >
                            {mobileStatsOpen ? '▲' : '▼'} More
                        </button>
                    </div>
                    {mobileStatsOpen && (
                        <div className="mobile-stats-expanded">
                            <span className="topbar-stat">
                                <span className="topbar-stat-icon">🛡️</span>
                                <span className="topbar-stat-value">{routeData.waypoints?.length || 0} safe stops</span>
                            </span>
                            <span className="topbar-stat">
                                <span className="topbar-stat-icon">🏥</span>
                                <span className="topbar-stat-value">{routeData.hospitals?.length || 0} hospitals</span>
                            </span>
                            <span className="topbar-stat">
                                <span className="topbar-stat-icon">👮</span>
                                <span className="topbar-stat-value">{routeData.policeStations?.length || 0} police</span>
                            </span>
                        </div>
                    )}
                </div>
                <div className="route-topbar-actions">
                    <button
                        className={`navigate-btn ${isNavigating ? 'navigate-active' : ''}`}
                        onClick={handleToggleNavigate}
                    >
                        {isNavigating ? '⏹ Stop' : '📍 Navigate'}
                    </button>
                    <button
                        className={`show-route-btn ${isPlaying ? 'show-route-active' : ''}`}
                        onClick={handleTogglePlayback}
                    >
                        {isPlaying ? '⏹ Stop' : '▶ Tour'}
                    </button>
                    {isPlaying && (
                        <button className="speed-btn" onClick={cycleSpeed}>
                            {playbackSpeed}x ⚡
                        </button>
                    )}
                    <button className="end-nav-btn" onClick={handleEndNavigation}>
                        ⏹️ End
                    </button>
                    {user && (
                        <button
                            className={`save-route-btn ${saveStatus === 'saved' ? 'save-route-saved' : ''} ${saveStatus === 'limit' ? 'save-route-limit' : ''}`}
                            onClick={handleSaveRoute}
                            disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                            title={
                                saveStatus === 'saved' ? 'Route saved!' :
                                saveStatus === 'limit' ? 'Max 10 paths reached' :
                                saveStatus === 'error' ? 'Failed to save' :
                                'Save this route'
                            }
                        >
                            {saveStatus === 'saving' ? (
                                <><span className="spinner" /> Saving...</>
                            ) : saveStatus === 'saved' ? (
                                <><Icons.Check size={14} /> Saved!</>
                            ) : saveStatus === 'limit' ? (
                                '⚠️ Limit (10)'
                            ) : saveStatus === 'error' ? (
                                '❌ Failed'
                            ) : (
                                <><Icons.Bookmark size={14} /> Save Route</>
                            )}
                        </button>
                    )}
                    {user && (
                        <button
                            className={`share-loc-btn ${liveShareActive ? 'live-sharing-active' : ''}`}
                            onClick={liveShareActive ? stopLiveShare : startLiveShare}
                            disabled={liveShareLoading}
                            title={liveShareActive ? 'Stop live sharing' : 'Share your live location'}
                        >
                            {liveShareLoading ? (
                                <><span className="spinner" /> Starting...</>
                            ) : liveShareActive ? (
                                <><span className="live-share-dot" /> Live</>
                            ) : (
                                <><Icons.Share2 size={14} /> Live Share</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Live Share Banner */}
            {liveShareActive && liveSessionId && (
                <div className="live-share-banner">
                    <div className="live-banner-left">
                        <div className="live-banner-indicator">
                            <span className="live-banner-dot" />
                            <span className="live-banner-ring" />
                        </div>
                        <div className="live-banner-text">
                            <span className="live-banner-title">Live Sharing Active</span>
                            <span className="live-banner-sub">Anyone with the link can track you</span>
                        </div>
                    </div>
                    <div className="live-banner-actions">
                        <button className="live-copy-btn" onClick={copyLiveLink}>
                            {liveShareCopied ? (
                                <><Icons.Check size={13} /> Copied</>
                            ) : (
                                <><Icons.Share2 size={13} /> Share Link</>
                            )}
                        </button>
                        <button className="live-stop-btn" onClick={stopLiveShare}>
                            <Icons.X size={13} /> Stop
                        </button>
                    </div>
                </div>
            )}

            {/* AI Warning */}
            {aiWarning && (
                <div className="route-warning">
                    ⚡ {aiWarning}
                </div>
            )}

            {/* Split View: Directions Panel + Full Map */}
            <div className={`route-map-full ${panelHidden ? 'panel-collapsed' : ''}`}>
                {/* Panel Toggle Button */}
                <button
                    className={`panel-toggle-btn ${panelHidden ? 'panel-toggle-collapsed' : ''}`}
                    onClick={() => setPanelHidden(prev => !prev)}
                    title={panelHidden ? 'Show Directions' : 'Hide Directions'}
                >
                    {panelHidden ? '📋 ›' : '‹ Hide'}
                </button>
                <div className={`dp-panel-wrap ${panelHidden ? 'dp-panel-hidden' : ''}`}>
                    <DirectionsPanel routeData={routeData} />
                </div>
                <div className="map-area-wrap">
                    <MapView
                        routeData={routeData}
                        isPlaying={isPlaying}
                        playbackSpeed={playbackSpeed}
                        isNavigating={isNavigating}
                        onPlaybackComplete={handlePlaybackComplete}
                        panelHidden={panelHidden}
                    />
                    {/* Floating legend overlay */}
                    <div className="map-legend-float">
                        <div className="legend-item"><span className="legend-dot" style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span> Start</div>
                        <div className="legend-item"><span className="legend-dot" style={{ background: '#ef4444', boxShadow: '0 0 6px #ef4444' }}></span> End</div>
                        <div className="legend-item"><span className="legend-dot" style={{ background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }}></span> Safe Stops</div>
                        <div className="legend-item"><span className="legend-dot" style={{ background: '#0ea5e9', boxShadow: '0 0 6px #0ea5e9' }}></span> Hospitals</div>
                        <div className="legend-item"><span className="legend-dot" style={{ background: '#818cf8', boxShadow: '0 0 6px #818cf8' }}></span> Police</div>
                    </div>
                </div>
            </div>

            {/* Feedback Overlay */}
            {showFeedback && (
                <div className="feedback-overlay">
                    <div className="feedback-overlay-card">
                        <div className="feedback-overlay-header">
                            <h2>Navigation Complete! 🎉</h2>
                            <p>How was your SafeRoute experience?</p>
                        </div>
                        <FeedbackForm onDone={handleFeedbackDone} routeData={routeData} />
                    </div>
                </div>
            )}

            {/* NaviX AI Chatbot */}
            <NaviXChat routeData={routeData} />

            {/* Floating SOS Button — only if emergency contact is saved */}
            {emergencyPhone && (
                <button
                    className="sos-float-btn"
                    onClick={triggerEmergencyCall}
                    title="Emergency Call"
                >
                    SOS
                </button>
            )}
        </div>
    );
}
