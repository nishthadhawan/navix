/**
 * AdminPanel Component
 * Premium dashboard for viewing all feedback reviews with stats,
 * plus user analytics (total users & saved paths).
 * Restricted to admin user only (ID: 69c2e46f3e2c7b09c8291257)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Icons from './Icons';

const API_URL = 'https://navix-backend-uly4.onrender.com/api';
const ADMIN_ID = '69c2e46f3e2c7b09c8291257';

const starString = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function AdminPanel() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' | 'users'

    // User stats state
    const [userStats, setUserStats] = useState({ totalUsers: 0, totalSavedPaths: 0, users: [] });
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState(null);

    const navigate = useNavigate();
    const { user } = useAuth();

    // Check admin access
    const isAdmin = user && user.id === ADMIN_ID;

    useEffect(() => {
        if (!isAdmin) {
            setLoading(false);
            setStatsLoading(false);
            return;
        }

        const token = localStorage.getItem('navix_token');

        const fetchReviews = async () => {
            try {
                const res = await axios.get(`${API_URL}/feedback`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setReviews(res.data.reviews || []);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load reviews.');
            }
            setLoading(false);
        };

        const fetchStats = async () => {
            try {
                const res = await axios.get(`${API_URL}/admin/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUserStats(res.data);
            } catch (err) {
                setStatsError(err.response?.data?.error || 'Failed to load user stats.');
            }
            setStatsLoading(false);
        };

        fetchReviews();
        fetchStats();
    }, [isAdmin]);

    const formatDate = (isoString) => {
        const d = new Date(isoString);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatTime = (isoString) => {
        const d = new Date(isoString);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const totalReviews = reviews.length;
    const avgWebsite = totalReviews > 0
        ? (reviews.reduce((s, r) => s + (r.websiteRating || 0), 0) / totalReviews).toFixed(1)
        : '—';
    const avgOverall = totalReviews > 0
        ? (reviews.reduce((s, r) => s + r.safety + r.condition + r.accessibility, 0) / (totalReviews * 3)).toFixed(1)
        : '—';

    // Detect if a name is just raw coordinates
    const isCoordName = (name) => name && /^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(name.trim());

    // Format a location name nicely
    const formatLocation = (name, lat, lng) => {
        if (!name || name === 'N/A') {
            if (lat && lng) return `${parseFloat(lat).toFixed(4)}°, ${parseFloat(lng).toFixed(4)}°`;
            return 'Unknown';
        }
        if (isCoordName(name)) {
            return `${parseFloat(lat || name.split(',')[0]).toFixed(4)}°, ${parseFloat(lng || name.split(',')[1]).toFixed(4)}°`;
        }
        return name;
    };

    // Check if we should show separate coord line (only if name is a real place name)
    const showCoord = (name) => name && !isCoordName(name) && name !== 'N/A';

    return (
        <div className="admin-page">
            <div className="bg-orbs">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            {!isAdmin ? (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: '100vh', gap: '16px',
                    color: 'var(--text-secondary)', textAlign: 'center', padding: '24px'
                }}>
                    <div style={{ fontSize: '3rem' }}>🔒</div>
                    <h2 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Access Denied</h2>
                    <p style={{ maxWidth: '360px', lineHeight: 1.6, fontSize: '0.9rem' }}>
                        This dashboard is restricted to the NaviX admin. Please sign in with the admin account to access it.
                    </p>
                    <button className="admin-back-btn" onClick={() => navigate('/home')} style={{ marginTop: '8px' }}>
                        ← Go Home
                    </button>
                </div>
            ) : (
            <>
            {/* Admin Nav Bar */}
            <nav className="admin-nav">
                <div className="admin-nav-brand">
                    <span className="admin-nav-icon"><Icons.BarChart size={20} /></span>
                    <div>
                        <div className="admin-nav-title">Admin Dashboard</div>
                        <div className="admin-nav-sub">NaviX Management Console</div>
                    </div>
                </div>
                <button className="admin-back-btn" onClick={() => navigate('/home')}>
                    ← Back to Home
                </button>
            </nav>

            <div className="admin-container">
                {/* ──── Top-level Stats Row ──── */}
                <div className="admin-stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                    {/* Users stat */}
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)' }}><Icons.Users size={20} /></div>
                        <div className="admin-stat-data">
                            <span className="admin-stat-value">{statsLoading ? '…' : userStats.totalUsers}</span>
                            <span className="admin-stat-label">Total Users</span>
                        </div>
                    </div>
                    {/* Saved Paths stat */}
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon" style={{ background: 'rgba(236, 72, 153, 0.1)' }}><Icons.Bookmark size={20} /></div>
                        <div className="admin-stat-data">
                            <span className="admin-stat-value">{statsLoading ? '…' : userStats.totalSavedPaths}</span>
                            <span className="admin-stat-label">Saved Paths</span>
                        </div>
                    </div>
                    {/* Reviews stat */}
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}><Icons.FileText size={20} /></div>
                        <div className="admin-stat-data">
                            <span className="admin-stat-value">{totalReviews}</span>
                            <span className="admin-stat-label">Total Reviews</span>
                        </div>
                    </div>
                    {/* Avg Website Rating */}
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon" style={{ background: 'rgba(251, 191, 36, 0.1)' }}><Icons.Star size={20} /></div>
                        <div className="admin-stat-data">
                            <span className="admin-stat-value">{avgWebsite}<span style={{ fontSize: '0.85rem', opacity: 0.5 }}>/5</span></span>
                            <span className="admin-stat-label">Avg Website Rating</span>
                        </div>
                    </div>
                    {/* Avg Route Rating */}
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}><Icons.TrendingUp size={20} /></div>
                        <div className="admin-stat-data">
                            <span className="admin-stat-value">{avgOverall}<span style={{ fontSize: '0.85rem', opacity: 0.5 }}>/5</span></span>
                            <span className="admin-stat-label">Avg Route Rating</span>
                        </div>
                    </div>
                </div>

                {/* ──── Tab Switcher ──── */}
                <div className="admin-tabs">
                    <button
                        id="admin-tab-reviews"
                        className={`admin-tab${activeTab === 'reviews' ? ' admin-tab--active' : ''}`}
                        onClick={() => setActiveTab('reviews')}
                    >
                        <Icons.FileText size={15} /> Reviews
                    </button>
                    <button
                        id="admin-tab-users"
                        className={`admin-tab${activeTab === 'users' ? ' admin-tab--active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <Icons.Users size={15} /> Users & Paths
                    </button>
                </div>

                {/* ──── Reviews Tab ──── */}
                {activeTab === 'reviews' && (
                <div className="admin-table-section">
                    <div className="admin-table-header">
                        <h3>📋 All Reviews</h3>
                        <span className="admin-table-count">{totalReviews} entries</span>
                    </div>

                    {loading ? (
                        <div className="admin-loading">
                            <div className="spinner"></div>
                            <p>Loading reviews...</p>
                        </div>
                    ) : error ? (
                        <div className="admin-error">{error}</div>
                    ) : reviews.length === 0 ? (
                        <div className="admin-empty">
                            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
                            <p>No reviews yet</p>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Reviews will appear here after users submit feedback</p>
                        </div>
                    ) : (
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Date & Time</th>
                                        <th>Route</th>
                                        <th>Safety</th>
                                        <th>Road</th>
                                        <th>Access.</th>
                                        <th>Website</th>
                                        <th>Comments</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reviews.map((r, i) => (
                                        <tr key={i}>
                                            <td className="admin-td-num">{i + 1}</td>
                                            <td className="admin-td-datetime">
                                                <div className="admin-date">{formatDate(r.timestamp)}</div>
                                                <div className="admin-time">{formatTime(r.timestamp)}</div>
                                            </td>
                                            <td className="admin-td-route">
                                                <div className="admin-route-card">
                                                    <div className="admin-route-point">
                                                        <span className="admin-route-dot admin-dot-start"></span>
                                                        <div className="admin-route-info">
                                                            <span className="admin-route-name">{formatLocation(r.startName, r.startLat, r.startLng)}</span>
                                                            {showCoord(r.startName) && r.startLat && (
                                                                <span className="admin-route-coord">{parseFloat(r.startLat).toFixed(4)}°, {parseFloat(r.startLng).toFixed(4)}°</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="admin-route-line"></div>
                                                    <div className="admin-route-point">
                                                        <span className="admin-route-dot admin-dot-end"></span>
                                                        <div className="admin-route-info">
                                                            <span className="admin-route-name">{formatLocation(r.endName, r.endLat, r.endLng)}</span>
                                                            {showCoord(r.endName) && r.endLat && (
                                                                <span className="admin-route-coord">{parseFloat(r.endLat).toFixed(4)}°, {parseFloat(r.endLng).toFixed(4)}°</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="admin-td-stars">{starString(r.safety)}</td>
                                            <td className="admin-td-stars">{starString(r.condition)}</td>
                                            <td className="admin-td-stars">{starString(r.accessibility)}</td>
                                            <td className="admin-td-stars">{starString(r.websiteRating || 0)}</td>
                                            <td className="admin-td-comment">{r.comments || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                )}

                {/* ──── Users & Paths Tab ──── */}
                {activeTab === 'users' && (
                <div className="admin-table-section">
                    <div className="admin-table-header">
                        <h3>👥 All Users & Saved Paths</h3>
                        <span className="admin-table-count">
                            {userStats.totalUsers} users · {userStats.totalSavedPaths} paths
                        </span>
                    </div>

                    {statsLoading ? (
                        <div className="admin-loading">
                            <div className="spinner"></div>
                            <p>Loading user analytics...</p>
                        </div>
                    ) : statsError ? (
                        <div className="admin-error">{statsError}</div>
                    ) : userStats.users.length === 0 ? (
                        <div className="admin-empty">
                            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🚫</div>
                            <p>No users registered yet</p>
                        </div>
                    ) : (
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Username</th>
                                        <th>Saved Paths</th>
                                        <th>Joined</th>
                                        <th>Usage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userStats.users.map((u, i) => (
                                        <tr key={i}>
                                            <td className="admin-td-num">{i + 1}</td>
                                            <td>
                                                <div className="admin-user-cell">
                                                    <div className="admin-user-avatar">
                                                        {u.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="admin-user-name">{u.username}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="admin-paths-badge">
                                                    <Icons.Bookmark size={13} />
                                                    <span>{u.savedPathsCount}</span>
                                                    <span className="admin-paths-max">/ 10</span>
                                                </div>
                                            </td>
                                            <td className="admin-td-datetime">
                                                <div className="admin-date">{u.joinedAt ? formatDate(u.joinedAt) : '—'}</div>
                                                <div className="admin-time">{u.joinedAt ? formatTime(u.joinedAt) : ''}</div>
                                            </td>
                                            <td>
                                                <div className="admin-usage-bar-wrap">
                                                    <div
                                                        className="admin-usage-bar"
                                                        style={{ width: `${(u.savedPathsCount / 10) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                )}
            </div>
            </>
            )}
        </div>
    );
}
