/**
 * EmergencyPage — Save emergency contact, enable shake-to-call
 * Premium UI with red accent theme for urgency
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Icons from './Icons';

const API_URL =
    import.meta.env.VITE_API_URL || 'https://navix-backend-uly4.onrender.com';

export default function EmergencyPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [shakeEnabled, setShakeEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setTimeout(() => setVisible(true), 100);
    }, []);

    // Fetch existing emergency contact
    useEffect(() => {
        async function fetchContact() {
            try {
                const token = localStorage.getItem('navix_token');
                const res = await axios.get(`${API_URL}/api/emergency`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setName(res.data.name || '');
                setPhone(res.data.phone || '');
                setShakeEnabled(res.data.shakeEnabled || false);
            } catch {
                // No saved contact yet — fine
            } finally {
                setLoading(false);
            }
        }
        fetchContact();
    }, []);

    const handleSave = async () => {
        if (!phone.trim()) {
            setError('Please enter a phone number');
            return;
        }
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            const token = localStorage.getItem('navix_token');
            await axios.put(`${API_URL}/api/emergency`, {
                name: name.trim(),
                phone: phone.trim(),
                shakeEnabled,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleTestCall = () => {
        if (!phone.trim()) {
            setError('Save a phone number first');
            return;
        }
        window.location.href = `tel:${phone.trim()}`;
    };

    const handleToggleShake = async () => {
        // On iOS, we need to request DeviceMotion permission on user gesture
        if (!shakeEnabled && typeof DeviceMotionEvent?.requestPermission === 'function') {
            try {
                const result = await DeviceMotionEvent.requestPermission();
                if (result !== 'granted') {
                    setError('Motion permission denied. Enable it in Settings.');
                    return;
                }
            } catch {
                setError('Could not request motion permission.');
                return;
            }
        }
        setShakeEnabled(prev => !prev);
    };

    if (loading) {
        return (
            <div className="emer-page">
                <div className="emer-loading">
                    <div className="large-spinner" />
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="emer-page">
            {/* Background effects */}
            <div className="emer-bg-glow" />
            <div className="emer-bg-glow emer-bg-glow-2" />

            {/* Top Nav */}
            <nav className="emer-nav">
                <a href="/" className="emer-nav-brand">
                    <img src="/logo.png" alt="NaviX" className="emer-nav-logo" />
                    <span className="emer-nav-name">NaviX</span>
                </a>
                <button className="emer-back-btn" onClick={() => navigate('/home')}>
                    <Icons.ArrowLeft size={14} /> Back
                </button>
            </nav>

            <div className={`emer-content ${visible ? 'emer-visible' : ''}`}>
                {/* Hero */}
                <div className="emer-hero">
                    <div className="emer-hero-icon">🚨</div>
                    <h1 className="emer-title">Emergency Contact</h1>
                    <p className="emer-subtitle">
                        Save a contact for instant one-tap or shake-to-call in emergencies
                    </p>
                </div>

                {/* Contact Form Card */}
                <div className="emer-card">
                    <div className="emer-card-header">
                        <Icons.Phone size={18} />
                        <span>Emergency Contact</span>
                    </div>

                    <div className="emer-form">
                        <div className="emer-field">
                            <label className="emer-label">Contact Name</label>
                            <input
                                type="text"
                                className="emer-input"
                                placeholder="e.g. Mom, Dad, Friend"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                maxLength={50}
                            />
                        </div>

                        <div className="emer-field">
                            <label className="emer-label">Phone Number <span className="emer-required">*</span></label>
                            <input
                                type="tel"
                                className="emer-input emer-input-phone"
                                placeholder="e.g. +91 98765 43210"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                maxLength={20}
                            />
                        </div>

                        {error && <div className="emer-error">{error}</div>}
                        {saved && <div className="emer-success">✅ Contact saved successfully!</div>}

                        <button
                            className={`emer-save-btn ${saving ? 'emer-saving' : ''}`}
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <><span className="spinner" /> Saving...</>
                            ) : (
                                <><Icons.Check size={16} /> Save Contact</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Shake-to-Call Card */}
                <div className="emer-card">
                    <div className="emer-card-header">
                        <span className="emer-shake-icon">🫨</span>
                        <span>Shake to Call</span>
                    </div>
                    <p className="emer-card-desc">
                        Shake your phone 3 times rapidly while on the map to instantly call your emergency contact.
                    </p>

                    <button
                        className={`emer-toggle-btn ${shakeEnabled ? 'emer-toggle-on' : ''}`}
                        onClick={handleToggleShake}
                    >
                        <span className="emer-toggle-track">
                            <span className="emer-toggle-thumb" />
                        </span>
                        <span>{shakeEnabled ? 'Enabled' : 'Disabled'}</span>
                    </button>

                    {shakeEnabled && (
                        <div className="emer-shake-hint">
                            <div className="emer-shake-anim">📱</div>
                            Shake detection is active on the navigation page
                        </div>
                    )}
                </div>

                {/* SOS Info Card */}
                <div className="emer-card emer-card-sos">
                    <div className="emer-card-header">
                        <span>🔴</span>
                        <span>SOS Button</span>
                    </div>
                    <p className="emer-card-desc">
                        A floating SOS button appears on the map view page. One tap instantly opens the dialer with your emergency number.
                    </p>
                    <div className="emer-sos-preview">
                        <div className="emer-sos-demo-btn">SOS</div>
                        <span>Visible on map page →</span>
                    </div>
                </div>

                {/* Test Call */}
                <div className="emer-card">
                    <div className="emer-card-header">
                        <span>🧪</span>
                        <span>Test Emergency Call</span>
                    </div>
                    <p className="emer-card-desc">
                        Opens your phone's dialer with the saved number. Does not auto-dial — you must press call.
                    </p>
                    <button className="emer-test-btn" onClick={handleTestCall}>
                        <Icons.Phone size={15} /> Test Call
                    </button>
                </div>

                {/* How It Works */}
                <div className="emer-how">
                    <h3 className="emer-how-title">How it works</h3>
                    <div className="emer-steps">
                        <div className="emer-step">
                            <div className="emer-step-num">1</div>
                            <div className="emer-step-text">
                                <strong>Save</strong> your emergency contact number above
                            </div>
                        </div>
                        <div className="emer-step">
                            <div className="emer-step-num">2</div>
                            <div className="emer-step-text">
                                <strong>Enable</strong> shake-to-call or use the SOS button
                            </div>
                        </div>
                        <div className="emer-step">
                            <div className="emer-step-num">3</div>
                            <div className="emer-step-text">
                                <strong>Shake</strong> your phone or tap SOS on the map page — instant call
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="emer-footer">
                    NaviX © 2026 · Your safety, our priority
                </footer>
            </div>
        </div>
    );
}
