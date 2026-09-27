/**
 * SavedPathsPage — Standalone page for viewing & managing saved routes
 * Wraps the SavedPaths component in a full-page layout with navigation.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SavedPaths from './SavedPaths';
import { useAuth } from '../context/AuthContext';
import Icons from './Icons';

const API_URL = 'https://navix-backend-uly4.onrender.com/api';

export default function SavedPathsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleNavigateRoute = async ({ start, end, profile }) => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_URL}/route`, { start, end, profile }, { timeout: 120000 });
            sessionStorage.setItem('safeRouteData', JSON.stringify(response.data));
            navigate('/navigate');
        } catch (err) {
            alert(err.response?.data?.error || err.message || 'Failed to generate route.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="admin-page">
                <div className="bg-orbs">
                    <div className="orb orb-1"></div>
                    <div className="orb orb-2"></div>
                    <div className="orb orb-3"></div>
                </div>
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: '100vh', gap: '16px',
                    color: 'var(--text-secondary)', textAlign: 'center', padding: '24px'
                }}>
                    <div style={{ fontSize: '3rem' }}>🔒</div>
                    <h2 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Login Required</h2>
                    <p style={{ maxWidth: '360px', lineHeight: 1.6, fontSize: '0.9rem' }}>
                        Please sign in to view your saved paths.
                    </p>
                    <button className="admin-back-btn" onClick={() => navigate('/login')} style={{ marginTop: '8px' }}>
                        → Login
                    </button>
                </div>
            </div>
        );
    }

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
                    <span className="admin-nav-icon" style={{ background: 'rgba(236, 72, 153, 0.1)', borderColor: 'rgba(236, 72, 153, 0.2)' }}>
                        <Icons.Bookmark size={20} />
                    </span>
                    <div>
                        <div className="admin-nav-title">My Saved Paths</div>
                        <div className="admin-nav-sub">Manage your bookmarked routes</div>
                    </div>
                </div>
                <button className="admin-back-btn" onClick={() => navigate('/home')}>← Back to Home</button>
            </nav>

            <div className="admin-container">
                <SavedPaths onNavigate={handleNavigateRoute} />
            </div>

            {/* Loading overlay */}
            {isLoading && (
                <div className="home-loading">
                    <div className="glass-card loading-overlay">
                        <div className="large-spinner"></div>
                        <p>Generating your safest route...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
