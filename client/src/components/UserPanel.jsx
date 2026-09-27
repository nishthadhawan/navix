/**
 * UserPanel Component
 * Admin-only page to view all users, their saved paths, and delete users.
 * Restricted to admin user only (ID: 69c2e46f3e2c7b09c8291257)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Icons from './Icons';

const API_URL = 'https://navix-s9yb.onrender.com/api';
const ADMIN_ID = '69c2e46f3e2c7b09c8291257';

export default function UserPanel() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedUser, setExpandedUser] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user && user.id === ADMIN_ID;

    const token = localStorage.getItem('navix_token');

    useEffect(() => {
        if (!isAdmin) {
            setLoading(false);
            return;
        }
        fetchUsers();
    }, [isAdmin]);

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data.users || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load users.');
        }
        setLoading(false);
    };

    const handleDelete = async (userId, username) => {
        if (confirmDelete !== userId) {
            setConfirmDelete(userId);
            return;
        }

        setDeletingId(userId);
        try {
            await axios.delete(`${API_URL}/admin/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers((prev) => prev.filter((u) => u._id !== userId));
            setConfirmDelete(null);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete user.');
        }
        setDeletingId(null);
    };

    const formatDate = (iso) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatDistance = (m) => {
        if (!m) return '—';
        return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
    };

    const formatDuration = (s) => {
        if (!s) return '—';
        const mins = Math.round(s / 60);
        if (mins < 60) return `${mins} min`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    };

    const profileLabel = (p) => {
        const map = {
            'driving-car': '🚗 Driving',
            'cycling-regular': '🚲 Cycling',
            'foot-walking': '🚶 Walking',
        };
        return map[p] || p || '—';
    };

    const totalPaths = users.reduce((s, u) => s + u.savedRoutes.length, 0);

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
                        This panel is restricted to the NaviX admin.
                    </p>
                    <button className="admin-back-btn" onClick={() => navigate('/home')} style={{ marginTop: '8px' }}>
                        ← Go Home
                    </button>
                </div>
            ) : (
            <>
                {/* Nav */}
                <nav className="admin-nav">
                    <div className="admin-nav-brand">
                        <span className="admin-nav-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', borderColor: 'rgba(168, 85, 247, 0.2)' }}>
                            <Icons.Users size={20} />
                        </span>
                        <div>
                            <div className="admin-nav-title">User Management</div>
                            <div className="admin-nav-sub">View users, saved paths & manage accounts</div>
                        </div>
                    </div>
                    <button className="admin-back-btn" onClick={() => navigate('/home')}>← Back to Home</button>
                </nav>

                <div className="admin-container">
                    {/* Stats Row */}
                    <div className="admin-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <div className="admin-stat-card">
                            <div className="admin-stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)' }}><Icons.Users size={20} /></div>
                            <div className="admin-stat-data">
                                <span className="admin-stat-value">{users.length}</span>
                                <span className="admin-stat-label">Total Users</span>
                            </div>
                        </div>
                        <div className="admin-stat-card">
                            <div className="admin-stat-icon" style={{ background: 'rgba(236, 72, 153, 0.1)' }}><Icons.Bookmark size={20} /></div>
                            <div className="admin-stat-data">
                                <span className="admin-stat-value">{totalPaths}</span>
                                <span className="admin-stat-label">Total Saved Paths</span>
                            </div>
                        </div>
                        <div className="admin-stat-card">
                            <div className="admin-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}><Icons.TrendingUp size={20} /></div>
                            <div className="admin-stat-data">
                                <span className="admin-stat-value">
                                    {users.length > 0 ? (totalPaths / users.length).toFixed(1) : '0'}
                                </span>
                                <span className="admin-stat-label">Avg Paths / User</span>
                            </div>
                        </div>
                    </div>

                    {/* Users List */}
                    <div className="admin-table-section">
                        <div className="admin-table-header">
                            <h3>👥 Registered Users</h3>
                            <span className="admin-table-count">{users.length} users · {totalPaths} saved paths</span>
                        </div>

                        {loading ? (
                            <div className="admin-loading">
                                <div className="spinner"></div>
                                <p>Loading users...</p>
                            </div>
                        ) : error ? (
                            <div className="admin-error">{error}</div>
                        ) : users.length === 0 ? (
                            <div className="admin-empty">
                                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🚫</div>
                                <p>No users registered yet</p>
                            </div>
                        ) : (
                            <div className="up-user-list">
                                {users.map((u) => {
                                    const isExpanded = expandedUser === u._id;
                                    const isAdminUser = u._id === ADMIN_ID;

                                    return (
                                        <div key={u._id} className={`up-user-card ${isExpanded ? 'up-user-card--expanded' : ''}`}>
                                            {/* User Row */}
                                            <div className="up-user-row" onClick={() => setExpandedUser(isExpanded ? null : u._id)}>
                                                <div className="up-user-left">
                                                    <div className="admin-user-avatar">{u.username.charAt(0).toUpperCase()}</div>
                                                    <div className="up-user-info">
                                                        <div className="up-user-name">
                                                            {u.username}
                                                            {isAdminUser && <span className="up-admin-badge">Admin</span>}
                                                        </div>
                                                        <div className="up-user-meta">
                                                            Joined {formatDate(u.joinedAt)} · {u.savedRoutes.length} saved path{u.savedRoutes.length !== 1 ? 's' : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="up-user-right">
                                                    <div className="admin-paths-badge">
                                                        <Icons.Bookmark size={13} />
                                                        <span>{u.savedRoutes.length}</span>
                                                        <span className="admin-paths-max">/ 10</span>
                                                    </div>
                                                    {!isAdminUser && (
                                                        <button
                                                            className={`up-delete-btn ${confirmDelete === u._id ? 'up-delete-btn--confirm' : ''}`}
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(u._id, u.username); }}
                                                            disabled={deletingId === u._id}
                                                            title={confirmDelete === u._id ? 'Click again to confirm' : 'Delete user'}
                                                        >
                                                            {deletingId === u._id ? (
                                                                <span className="up-delete-spinner"></span>
                                                            ) : confirmDelete === u._id ? (
                                                                <>Confirm?</>
                                                            ) : (
                                                                <Icons.Trash2 size={14} />
                                                            )}
                                                        </button>
                                                    )}
                                                    <span className={`up-chevron ${isExpanded ? 'up-chevron--open' : ''}`}>
                                                        <Icons.ChevronRight size={16} />
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Expanded Saved Routes */}
                                            {isExpanded && (
                                                <div className="up-routes-list">
                                                    {u.savedRoutes.length === 0 ? (
                                                        <div className="up-routes-empty">
                                                            <Icons.Route size={18} />
                                                            <span>No saved paths yet</span>
                                                        </div>
                                                    ) : (
                                                        u.savedRoutes.map((r, idx) => (
                                                            <div key={r._id || idx} className="up-route-item">
                                                                <div className="up-route-num">{idx + 1}</div>
                                                                <div className="up-route-body">
                                                                    <div className="up-route-endpoints">
                                                                        <span className="up-route-dot up-dot-start"></span>
                                                                        <span className="up-route-place">{r.startName || 'Unknown'}</span>
                                                                        <span className="up-route-arrow">→</span>
                                                                        <span className="up-route-dot up-dot-end"></span>
                                                                        <span className="up-route-place">{r.endName || 'Unknown'}</span>
                                                                    </div>
                                                                    <div className="up-route-meta">
                                                                        <span>{profileLabel(r.profile)}</span>
                                                                        <span className="up-route-sep">·</span>
                                                                        <span>{formatDistance(r.distance)}</span>
                                                                        <span className="up-route-sep">·</span>
                                                                        <span>{formatDuration(r.duration)}</span>
                                                                        <span className="up-route-sep">·</span>
                                                                        <span>{formatDate(r.savedAt)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </>
            )}
        </div>
    );
}
