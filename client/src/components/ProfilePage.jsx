/**
 * ProfilePage — User profile with stats and change password
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Icons from './Icons';

const API_URL =
    import.meta.env.VITE_API_URL || 'https://navix-backend-uly4.onrender.com';

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);

    // Change password state
    const [showPwForm, setShowPwForm] = useState(false);
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMsg, setPwMsg] = useState(null); // { type: 'success' | 'error', text }
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);

    useEffect(() => {
        setTimeout(() => setVisible(true), 100);
    }, []);

    useEffect(() => {
        async function fetchProfile() {
            try {
                const token = localStorage.getItem('navix_token');
                const res = await axios.get(`${API_URL}/api/auth/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setProfile(res.data.user);
            } catch {
                // Failed
            } finally {
                setLoading(false);
            }
        }
        fetchProfile();
    }, []);

    const handleChangePassword = async () => {
        setPwMsg(null);

        if (!currentPw || !newPw) {
            setPwMsg({ type: 'error', text: 'Fill in all fields' });
            return;
        }
        if (newPw.length < 6) {
            setPwMsg({ type: 'error', text: 'New password must be at least 6 characters' });
            return;
        }
        if (newPw !== confirmPw) {
            setPwMsg({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        setPwLoading(true);
        try {
            const token = localStorage.getItem('navix_token');
            await axios.put(`${API_URL}/api/auth/change-password`, {
                currentPassword: currentPw,
                newPassword: newPw,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setPwMsg({ type: 'success', text: 'Password changed successfully!' });
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
            setTimeout(() => setShowPwForm(false), 2000);
        } catch (err) {
            setPwMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
        } finally {
            setPwLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    };

    const getInitial = () => {
        return (profile?.username || user?.username || '?')[0].toUpperCase();
    };

    if (loading) {
        return (
            <div className="prof-page">
                <div className="prof-loading">
                    <div className="large-spinner" />
                    <p>Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="prof-page">
            {/* Background */}
            <div className="prof-bg-glow" />
            <div className="prof-bg-glow prof-bg-glow-2" />

            {/* Nav */}
            <nav className="prof-nav">
                <a href="/" className="prof-nav-brand">
                    <img src="/logo.png" alt="NaviX" className="prof-nav-logo" />
                    <span className="prof-nav-name">NaviX</span>
                </a>
                <button className="prof-back-btn" onClick={() => navigate('/home')}>
                    <Icons.ArrowLeft size={14} /> Back
                </button>
            </nav>

            <div className={`prof-content ${visible ? 'prof-visible' : ''}`}>
                {/* Profile Header */}
                <div className="prof-header">
                    <div className="prof-avatar-wrap">
                        <div className="prof-avatar-glow" />
                        <div className="prof-avatar">{getInitial()}</div>
                    </div>
                    <h1 className="prof-username">{profile?.username || user?.username}</h1>
                    <p className="prof-member-since">
                        <Icons.Clock size={13} /> Member since {formatDate(profile?.createdAt)}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="prof-stats">
                    <div className="prof-stat-card">
                        <div className="prof-stat-icon">🗺️</div>
                        <div className="prof-stat-value">{profile?.savedRoutesCount ?? 0}</div>
                        <div className="prof-stat-label">Saved Paths</div>
                    </div>
                    <div className="prof-stat-card">
                        <div className="prof-stat-icon">⭐</div>
                        <div className="prof-stat-value">{profile?.feedbackCount ?? 0}</div>
                        <div className="prof-stat-label">Feedback Given</div>
                    </div>
                    <div className="prof-stat-card">
                        <div className="prof-stat-icon">{profile?.hasEmergencyContact ? '✅' : '❌'}</div>
                        <div className="prof-stat-value">{profile?.hasEmergencyContact ? 'Set' : 'Not Set'}</div>
                        <div className="prof-stat-label">Emergency Contact</div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="prof-actions">
                    <button className="prof-action-btn" onClick={() => navigate('/paths')}>
                        <Icons.Bookmark size={16} /> View Saved Paths
                    </button>
                    <button className="prof-action-btn" onClick={() => navigate('/emergency')}>
                        <Icons.Phone size={16} /> Emergency Contact
                    </button>
                </div>

                {/* Change Password */}
                <div className="prof-card">
                    <div className="prof-card-header" onClick={() => { setShowPwForm(p => !p); setPwMsg(null); }}>
                        <div className="prof-card-title">
                            <Icons.Lock size={16} />
                            <span>Change Password</span>
                        </div>
                        <span className="prof-card-chevron">{showPwForm ? '▲' : '▼'}</span>
                    </div>

                    {showPwForm && (
                        <div className="prof-pw-form">
                            <div className="prof-field">
                                <label className="prof-label">Current Password</label>
                                <div className="prof-input-wrap">
                                    <input
                                        type={showCurrentPw ? 'text' : 'password'}
                                        className="prof-input"
                                        placeholder="Enter current password"
                                        value={currentPw}
                                        onChange={e => setCurrentPw(e.target.value)}
                                    />
                                    <button className="prof-eye-btn" onClick={() => setShowCurrentPw(p => !p)}>
                                        {showCurrentPw ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
                                    </button>
                                </div>
                            </div>

                            <div className="prof-field">
                                <label className="prof-label">New Password</label>
                                <div className="prof-input-wrap">
                                    <input
                                        type={showNewPw ? 'text' : 'password'}
                                        className="prof-input"
                                        placeholder="At least 6 characters"
                                        value={newPw}
                                        onChange={e => setNewPw(e.target.value)}
                                    />
                                    <button className="prof-eye-btn" onClick={() => setShowNewPw(p => !p)}>
                                        {showNewPw ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
                                    </button>
                                </div>
                            </div>

                            <div className="prof-field">
                                <label className="prof-label">Confirm New Password</label>
                                <input
                                    type="password"
                                    className="prof-input"
                                    placeholder="Re-enter new password"
                                    value={confirmPw}
                                    onChange={e => setConfirmPw(e.target.value)}
                                />
                            </div>

                            {pwMsg && (
                                <div className={`prof-msg prof-msg-${pwMsg.type}`}>{pwMsg.text}</div>
                            )}

                            <button
                                className="prof-pw-btn"
                                onClick={handleChangePassword}
                                disabled={pwLoading}
                            >
                                {pwLoading ? <><span className="spinner" /> Updating...</> : 'Update Password'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Logout */}
                <button className="prof-logout-btn" onClick={() => { logout(); navigate('/login'); }}>
                    <Icons.LogOut size={16} /> Sign Out
                </button>

                {/* Footer */}
                <footer className="prof-footer">
                    NaviX © 2026 · Navigate Safely, Anywhere
                </footer>
            </div>
        </div>
    );
}
