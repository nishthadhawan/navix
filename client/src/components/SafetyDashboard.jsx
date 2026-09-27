/**
 * SafetyDashboard Component
 * Displays safety scores for Indian subdistricts based on
 * hospital and police station density data.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';


const API_URL = 'https://navix-backend-uly4.onrender.com/api';

export default function SafetyDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [stateFilter, setStateFilter] = useState('');
    const [states, setStates] = useState([]);
    const navigate = useNavigate();

    const fetchData = async (query = '', state = '') => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (query) params.append('q', query);
            if (state) params.append('state', state);
            params.append('limit', '200');
            const res = await axios.get(`${API_URL}/safety-scores?${params.toString()}`);
            setData(res.data);
        } catch (err) {
            console.error('Failed to load safety scores:', err);
        }
        setLoading(false);
    };

    // Load all states on mount
    useEffect(() => {
        const loadStates = async () => {
            try {
                const res = await axios.get(`${API_URL}/safety-scores?limit=5000`);
                const allStates = [...new Set(res.data.subdistricts.map(d => d.state))].sort();
                setStates(allStates);
                setData(res.data);
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        loadStates();
    }, []);

    // Re-fetch on search or filter change
    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchData(search, stateFilter);
        }, 300);
        return () => clearTimeout(timeout);
    }, [search, stateFilter]);

    const getScoreBar = (score) => {
        const percent = Math.round(score * 100);
        let color = '#ef4444';
        if (percent >= 80) color = '#10b981';
        else if (percent >= 60) color = '#22c55e';
        else if (percent >= 40) color = '#eab308';
        else if (percent >= 20) color = '#f97316';
        return (
            <div className="safety-score-bar">
                <div className="safety-score-fill" style={{ width: `${percent}%`, background: color }}></div>
            </div>
        );
    };

    const getScoreBadge = (score, label) => {
        const percent = Math.round(score * 100);
        let color = '#ef4444';
        if (percent >= 80) color = '#10b981';
        else if (percent >= 60) color = '#22c55e';
        else if (percent >= 40) color = '#eab308';
        else if (percent >= 20) color = '#f97316';
        return (
            <span className="safety-badge" style={{ color, borderColor: `${color}44` }}>
                {percent} — {label}
            </span>
        );
    };

    return (
        <div className="admin-page">
            <div className="bg-orbs">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            {/* Nav */}
            <nav className="admin-nav">
                <div className="admin-nav-brand">
                    <span className="admin-nav-icon">🛡️</span>
                    <div>
                        <div className="admin-nav-title">Safety Scores</div>
                        <div className="admin-nav-sub">Subdistrict Safety Analysis</div>
                    </div>
                </div>
                <button className="admin-back-btn" onClick={() => navigate('/home')}>
                    ← Back to Home
                </button>
            </nav>

            <div className="admin-container">
                {/* Summary Stats */}
                {data && (
                    <div className="admin-stats">
                        <div className="admin-stat-card">
                            <div className="admin-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>📊</div>
                            <div className="admin-stat-data">
                                <span className="admin-stat-value">{data.total}</span>
                                <span className="admin-stat-label">Subdistricts</span>
                            </div>
                        </div>
                        <div className="admin-stat-card">
                            <div className="admin-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>🏆</div>
                            <div className="admin-stat-data">
                                <span className="admin-stat-value">{Math.round((data.avgScore || 0) * 100)}<span style={{ fontSize: '0.85rem', opacity: 0.5 }}>/100</span></span>
                                <span className="admin-stat-label">Avg Safety Score</span>
                            </div>
                        </div>
                        <div className="admin-stat-card">
                            <div className="admin-stat-icon" style={{ background: 'rgba(251, 191, 36, 0.1)' }}>🥇</div>
                            <div className="admin-stat-data">
                                <span className="admin-stat-value" style={{ fontSize: '1.1rem' }}>{data.safest?.name || '—'}</span>
                                <span className="admin-stat-label">Safest ({Math.round((data.safest?.score || 0) * 100)})</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search & Filter */}
                <div className="safety-controls">
                    <div className="safety-search-wrap">
                        <span className="safety-search-icon">🔍</span>
                        <input
                            type="text"
                            className="safety-search"
                            placeholder="Search subdistrict, district, or state..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="safety-state-filter"
                        value={stateFilter}
                        onChange={(e) => setStateFilter(e.target.value)}
                    >
                        <option value="">All States</option>
                        {states.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                {/* Table */}
                <div className="admin-table-section">
                    <div className="admin-table-header">
                        <h3>🗺️ Subdistrict Safety Rankings</h3>
                        <span className="admin-table-count">{data?.showing || 0} shown</span>
                    </div>

                    {loading ? (
                        <div className="admin-loading">
                            <div className="spinner"></div>
                            <p>Calculating safety scores...</p>
                        </div>
                    ) : !data || data.subdistricts.length === 0 ? (
                        <div className="admin-empty">
                            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔍</div>
                            <p>No subdistricts found</p>
                        </div>
                    ) : (
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Subdistrict</th>
                                        <th>District</th>
                                        <th>State</th>
                                        <th>🏥 Hospitals</th>
                                        <th>👮 Police</th>
                                        <th>Area (km²)</th>
                                        <th>Safety Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.subdistricts.map((d, i) => (
                                        <tr key={i}>
                                            <td className="admin-td-num">{i + 1}</td>
                                            <td style={{ fontWeight: 600 }}>{d.subDistrict}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{d.district}</td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{d.state}</td>
                                            <td style={{ textAlign: 'center' }}>{d.hospitals}</td>
                                            <td style={{ textAlign: 'center' }}>{d.policeStations}</td>
                                            <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{d.estimatedAreaKm2}</td>
                                            <td className="safety-score-cell">
                                                {getScoreBadge(d.safetyScore, d.safetyLabel)}
                                                {getScoreBar(d.safetyScore)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
