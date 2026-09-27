/**
 * DirectionsPanel Component
 * Premium step-by-step navigation directions with timeline UI.
 */

import React from 'react';


// ORS step type → icon
const getDirectionIcon = (type) => {
    switch (type) {
        case 0: return '↰';   // Left
        case 1: return '↱';   // Right
        case 2: return '⤿';   // Sharp left
        case 3: return '⤾';   // Sharp right
        case 4: return '↖';   // Slight left
        case 5: return '↗';   // Slight right
        case 6: return '↑';   // Straight
        case 7: return '⟳';   // Roundabout
        case 8: return '↗';   // Exit roundabout
        case 9: return '⤺';   // U-turn
        case 10: return '◉';  // Goal
        case 11: return '◎';  // Depart
        case 12: return '↖';  // Keep left
        case 13: return '↗';  // Keep right
        default: return '→';
    }
};

const formatDistance = (meters) => {
    if (!meters || meters < 1) return '';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
};

const formatDuration = (seconds) => {
    if (!seconds || seconds < 1) return '';
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
};

export default function DirectionsPanel({ routeData }) {
    if (!routeData || !routeData.steps || routeData.steps.length === 0) {
        return null;
    }

    const { steps, startName, endName, startCoords, endCoords, travelProfile, distance, duration } = routeData;

    const formatCoord = (coord) => coord ? coord.toFixed(4) : '';

    const travelModeInfo = {
        'driving-car': { label: 'Driving', emoji: '🚗' },
        'cycling-regular': { label: 'Cycling', emoji: '🚴' },
        'foot-walking': { label: 'Walking', emoji: '🚶' },
    };
    const mode = travelModeInfo[travelProfile] || { label: travelProfile || 'Unknown', emoji: '🗺️' };

    // Compute total stats
    const totalDist = distance ? (distance / 1000).toFixed(1) : '—';
    const totalDur = duration ? formatDuration(duration) : '—';

    return (
        <div className="dp-panel">
            {/* Header */}
            <div className="dp-header">
                <div className="dp-header-top">
                    <span className="dp-logo"><img src="/logo.png" alt="NaviX" className="dp-logo-img" /> Directions</span>
                    <span className="dp-mode-badge">{mode.emoji} {mode.label}</span>
                </div>
                <div className="dp-summary">
                    <div className="dp-summary-item">
                        <span className="dp-summary-value">{totalDist}</span>
                        <span className="dp-summary-label">km</span>
                    </div>
                    <div className="dp-summary-divider"></div>
                    <div className="dp-summary-item">
                        <span className="dp-summary-value">{totalDur}</span>
                        <span className="dp-summary-label">est.</span>
                    </div>
                    <div className="dp-summary-divider"></div>
                    <div className="dp-summary-item">
                        <span className="dp-summary-value">{steps.length}</span>
                        <span className="dp-summary-label">steps</span>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="dp-timeline">

                {/* Start Node */}
                <div className="dp-node dp-node-start">
                    <div className="dp-node-dot dp-dot-green">
                        <div className="dp-dot-pulse"></div>
                    </div>
                    <div className="dp-node-line"></div>
                    <div className="dp-node-content">
                        <div className="dp-node-label">START</div>
                        <div className="dp-node-name">{startName}</div>
                        {startCoords && (
                            <div className="dp-node-coord">
                                {formatCoord(startCoords[1])}, {formatCoord(startCoords[0])}
                            </div>
                        )}
                    </div>
                </div>

                {/* Steps */}
                {steps.map((step, index) => (
                    <div key={index} className="dp-step">
                        <div className="dp-step-connector">
                            <div className="dp-step-line"></div>
                            <div className="dp-step-num">{index + 1}</div>
                            <div className="dp-step-line"></div>
                        </div>
                        <div className="dp-step-card">
                            <div className="dp-step-icon">{getDirectionIcon(step.type)}</div>
                            <div className="dp-step-body">
                                <div className="dp-step-instruction">{step.instruction}</div>
                                {(step.distance > 0 || step.duration > 0) && (
                                    <div className="dp-step-meta">
                                        {formatDistance(step.distance) && (
                                            <span className="dp-chip">{formatDistance(step.distance)}</span>
                                        )}
                                        {formatDuration(step.duration) && (
                                            <span className="dp-chip">{formatDuration(step.duration)}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Destination Node */}
                <div className="dp-node dp-node-end">
                    <div className="dp-node-dot dp-dot-red"></div>
                    <div className="dp-node-content">
                        <div className="dp-node-label">DESTINATION</div>
                        <div className="dp-node-name">{endName}</div>
                        {endCoords && (
                            <div className="dp-node-coord">
                                {formatCoord(endCoords[1])}, {formatCoord(endCoords[0])}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
