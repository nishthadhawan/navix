/**
 * RouteModal Component
 * Fullscreen modal overlay that displays route results:
 * map, stats, waypoint list, and close button
 */

import MapView from './MapView';

export default function RouteModal({ routeData, onClose, error }) {
    if (!routeData) return null;

    /**
     * Format distance to human-readable string
     */
    const formatDistance = (meters) => {
        if (!meters) return '—';
        const km = meters / 1000;
        return km >= 100 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
    };

    /**
     * Format duration to hours and minutes
     */
    const formatDuration = (seconds) => {
        if (!seconds) return '—';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.round((seconds % 3600) / 60);
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return `${mins} min`;
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content">
                {/* Modal Header */}
                <div className="modal-header">
                    <div className="modal-header-title">
                        <span>🗺️</span> Your Safe Route
                    </div>
                    <button className="modal-close" onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                </div>

                {/* Stats Bar */}
                <div className="modal-stats">
                    <div className="stat-card">
                        <div className="stat-value">{formatDistance(routeData.distance)}</div>
                        <div className="stat-label">Total Distance</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{formatDuration(routeData.duration)}</div>
                        <div className="stat-label">Est. Duration</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{routeData.waypoints?.length || 0}</div>
                        <div className="stat-label">Safe Stops</div>
                    </div>
                </div>

                {/* AI Warning */}
                {error && (
                    <div className="error-msg modal-warning">
                        <span>⚡</span>
                        <span>{error}</span>
                    </div>
                )}

                {/* Map */}
                <div className="modal-map">
                    <MapView routeData={routeData} />
                </div>

                {/* Waypoints */}
                {routeData.waypoints?.length > 0 && (
                    <div className="modal-waypoints">
                        <div className="waypoints-title">
                            <span>🛡️</span> Safe Stops ({routeData.waypoints.length})
                        </div>
                        <div className="modal-waypoint-grid">
                            {routeData.waypoints.map((wp, index) => (
                                <div key={index} className="waypoint-item">
                                    <div className="waypoint-name">
                                        {index + 1}. {wp.name}
                                    </div>
                                    <div className="waypoint-meta">
                                        <span>🏥 {wp.nearest_hospital}</span>
                                        <span>👮 {wp.nearest_police_station}</span>
                                        <span>📏 ~{wp.approx_distance_from_start_km} km from start</span>
                                    </div>
                                    <div className="waypoint-reason">"{wp.reason}"</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
