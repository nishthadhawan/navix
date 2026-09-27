/**
 * SavedPaths Component — View and manage saved routes
 * Shows saved routes in a premium glass-card list with navigate/delete actions.
 * Enforces max 10 saved routes per user.
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Icons from './Icons';

const API_URL =
    import.meta.env.VITE_API_URL || 'https://navix-backend-uly4.onrender.com';

const PROFILE_LABELS = {
    'driving-car': { icon: '🚗', label: 'Driving' },
    'cycling-regular': { icon: '🚴', label: 'Cycling' },
    'foot-walking': { icon: '🚶', label: 'Walking' },
};

export default function SavedPaths({ onNavigate }) {
    const { user } = useAuth();
    const [routes, setRoutes] = useState([]);
    const [count, setCount] = useState(0);
    const [max, setMax] = useState(10);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState(null);

    const fetchRoutes = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('navix_token');
            const res = await axios.get(`${API_URL}/api/saved-routes`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRoutes(res.data.routes || []);
            setCount(res.data.count || 0);
            setMax(res.data.max || 10);
        } catch (err) {
            setError('Failed to load saved paths.');
            console.error('Saved paths fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchRoutes();
    }, [user]);

    const handleDelete = async (id) => {
        if (deletingId) return;
        setDeletingId(id);
        try {
            const token = localStorage.getItem('navix_token');
            await axios.delete(`${API_URL}/api/saved-routes/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRoutes((prev) => prev.filter((r) => r._id !== id));
            setCount((prev) => prev - 1);
        } catch (err) {
            setError('Failed to delete route.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleNavigate = (route) => {
        if (onNavigate) {
            onNavigate({
                start: route.startCoords || route.startName,
                end: route.endCoords || route.endName,
                profile: route.profile || 'driving-car',
            });
        }
    };

    const formatDistance = (meters) => {
        if (!meters) return '—';
        const km = meters / 1000;
        return km >= 100 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '—';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.round((seconds % 3600) / 60);
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return `${mins} min`;
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    const getProfileInfo = (profile) => {
        return PROFILE_LABELS[profile] || PROFILE_LABELS['driving-car'];
    };

    if (!user) return null;

    return (
        <div className="saved-paths glass-card" id="saved-paths-panel">
            {/* Header */}
            <div className="saved-paths-header">
                <div className="saved-paths-title-row">
                    <div className="saved-paths-icon-wrap">
                        <Icons.Bookmark size={18} />
                    </div>
                    <div>
                        <h3 className="saved-paths-title">Saved Paths</h3>
                        <p className="saved-paths-subtitle">Your favorite routes</p>
                    </div>
                </div>
                <div className="saved-paths-meta">
                    <span className={`saved-paths-counter ${count >= max ? 'counter-full' : ''}`}>
                        {count}/{max}
                    </span>
                    <button
                        className="saved-paths-refresh"
                        onClick={fetchRoutes}
                        disabled={loading}
                        title="Refresh"
                    >
                        <Icons.RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="saved-paths-progress">
                <div
                    className="saved-paths-progress-fill"
                    style={{ width: `${(count / max) * 100}%` }}
                />
            </div>

            {/* Error */}
            {error && (
                <div className="saved-paths-error">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)}>✕</button>
                </div>
            )}

            {/* Loading */}
            {loading ? (
                <div className="saved-paths-loading">
                    <div className="spinner" />
                    <span>Loading saved paths...</span>
                </div>
            ) : routes.length === 0 ? (
                /* Empty State */
                <div className="saved-paths-empty">
                    <div className="saved-paths-empty-icon">🗺️</div>
                    <p className="saved-paths-empty-title">No saved paths yet</p>
                    <p className="saved-paths-empty-desc">
                        Navigate a route and tap "Save Route" to bookmark it here
                    </p>
                </div>
            ) : (
                /* Route List */
                <div className="saved-paths-list">
                    {routes.map((route, index) => {
                        const profileInfo = getProfileInfo(route.profile);
                        return (
                            <div
                                key={route._id}
                                className={`saved-path-item ${deletingId === route._id ? 'deleting' : ''}`}
                                style={{ animationDelay: `${index * 60}ms` }}
                            >
                                <div className="saved-path-content">
                                    <div className="saved-path-locations">
                                        <div className="saved-path-loc">
                                            <span className="loc-dot loc-start" />
                                            <div className="loc-info">
                                                <span className="loc-name" title={route.startName}>
                                                    {route.startName}
                                                </span>
                                                {route.startCoords && route.startCoords !== route.startName && (
                                                    <span className="loc-coords">{route.startCoords}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="saved-path-arrow">→</div>
                                        <div className="saved-path-loc">
                                            <span className="loc-dot loc-end" />
                                            <div className="loc-info">
                                                <span className="loc-name" title={route.endName}>
                                                    {route.endName}
                                                </span>
                                                {route.endCoords && route.endCoords !== route.endName && (
                                                    <span className="loc-coords">{route.endCoords}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="saved-path-stats">
                                        <span className="sp-stat" title="Travel Mode">
                                            {profileInfo.icon} {profileInfo.label}
                                        </span>
                                        <span className="sp-stat" title="Distance">
                                            📏 {formatDistance(route.distance)}
                                        </span>
                                        <span className="sp-stat" title="Duration">
                                            ⏱️ {formatDuration(route.duration)}
                                        </span>
                                        <span className="sp-stat sp-date" title="Saved on">
                                            {formatDate(route.savedAt)}
                                        </span>
                                    </div>
                                </div>
                                <div className="saved-path-actions">
                                    <button
                                        className="sp-navigate-btn"
                                        onClick={() => handleNavigate(route)}
                                        title="Navigate this route"
                                    >
                                        <Icons.Navigation size={14} />
                                    </button>
                                    <button
                                        className="sp-share-btn"
                                        onClick={async () => {
                                            const sc = route.startCoords || '';
                                            const ec = route.endCoords || '';
                                            const profileInfo = getProfileInfo(route.profile);
                                            const navixUrl = `https://navix-frontend.onrender.com/?start=${encodeURIComponent(sc)}&end=${encodeURIComponent(ec)}&profile=${route.profile || 'driving-car'}`;
                                            const mapsUrl = `https://www.google.com/maps/dir/${sc}/${ec}`;
                                            const text = [
                                                `🧭 NaviX — Safe Navigation`,
                                                ``,
                                                `🗺️ ${route.startName} → ${route.endName}`,
                                                `${profileInfo.icon} ${profileInfo.label} · ${formatDistance(route.distance)} · ${formatDuration(route.duration)}`,
                                                ``,
                                                `Navigate with NaviX 🛡️`,
                                                navixUrl,
                                                ``,
                                                `View on Google Maps 🔗`,
                                                mapsUrl,
                                            ].join('\n');
                                            try {
                                                if (navigator.share) {
                                                    await navigator.share({ title: `${route.startName} → ${route.endName}`, text });
                                                } else {
                                                    await navigator.clipboard.writeText(text);
                                                    alert('📋 Route link copied to clipboard!');
                                                }
                                            } catch (e) { /* user cancelled */ }
                                        }}
                                        title="Share this route"
                                    >
                                        <Icons.Share2 size={14} />
                                    </button>
                                    <button
                                        className="sp-delete-btn"
                                        onClick={() => handleDelete(route._id)}
                                        disabled={deletingId === route._id}
                                        title="Delete this path"
                                    >
                                        <Icons.Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
