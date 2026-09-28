/**
 * IntroPage Component
 * Premium landing page with rich animations, feature cards, How It Works, and CTA.
 */

import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Icons from './Icons';

export default function IntroPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [visible, setVisible] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [statsVisible, setStatsVisible] = useState(false);
    const [featuresVisible, setFeaturesVisible] = useState(false);
    const [stepsVisible, setStepsVisible] = useState(false);
    const statsRef = useRef(null);
    const featuresRef = useRef(null);
    const stepsRef = useRef(null);

    useEffect(() => {
        setVisible(true);

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        if (entry.target === statsRef.current) setStatsVisible(true);
                        if (entry.target === featuresRef.current) setFeaturesVisible(true);
                        if (entry.target === stepsRef.current) setStepsVisible(true);
                    }
                });
            },
            { threshold: 0.2 }
        );

        if (statsRef.current) observer.observe(statsRef.current);
        if (featuresRef.current) observer.observe(featuresRef.current);
        if (stepsRef.current) observer.observe(stepsRef.current);

        return () => observer.disconnect();
    }, []);

    return (
        <div className="intro-page">
            {/* Animated Background */}
            <div className="bg-orbs">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            {/* Animated Grid */}
            <div className="intro-grid-bg">
                <div className="intro-scanner-line"></div>
            </div>

            {/* Floating particles */}
            <div className="intro-particles">
                <div className="particle p1"></div>
                <div className="particle p2"></div>
                <div className="particle p3"></div>
                <div className="particle p4"></div>
                <div className="particle p5"></div>
                <div className="particle p6"></div>
                <div className="particle p7"></div>
                <div className="particle p8"></div>
            </div>

            {/* Nav */}
            <nav className={`intro-nav ${visible ? 'intro-nav-visible' : ''}`}>
                <a href="https://navix-navigator.onrender.com" className="intro-nav-brand" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <img src="/logo.png" alt="NaviX" className="intro-nav-logo" />
                    <span className="intro-nav-name">NaviX</span>
                </a>

                {/* Desktop nav */}
                <div className="nav-actions nav-desktop">
                    <button className="nav-btn" onClick={() => navigate('/safety')}><Icons.Shield size={16} /> Safety Scores</button>
                    <button className="nav-btn" onClick={() => navigate('/admin')}><Icons.BarChart size={16} /> Dashboard</button>
                    <button className="nav-btn nav-btn-primary" onClick={() => navigate('/home')}><Icons.Rocket size={16} /> Get Started</button>
                    <button
                        className={`theme-toggle ${theme === 'light' ? 'light' : ''}`}
                        onClick={toggleTheme}
                        aria-label="Toggle theme"
                        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        <span className="theme-toggle-icon">
                            {theme === 'dark' ? <Icons.Moon size={12} /> : <Icons.Sun size={12} />}
                        </span>
                    </button>
                    {user ? (
                        <div className="user-menu">
                            <div className="user-avatar">{user.username[0]}</div>
                            <span className="user-name">{user.username}</span>
                            <button className="user-logout-btn" onClick={logout}>Logout</button>
                        </div>
                    ) : (
                        <button className="nav-btn" onClick={() => navigate('/login')}><Icons.User size={16} /> Login</button>
                    )}
                </div>

                {/* Get Started — always visible */}
                <button className="nav-btn nav-btn-primary nav-cta" onClick={() => navigate('/home')}><Icons.Rocket size={16} /> Get Started</button>

                {/* Hamburger button (mobile) */}
                <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
                    <span className={`hamburger-line hl-1 ${menuOpen ? 'hl-open' : ''}`} />
                    <span className={`hamburger-line hl-2 ${menuOpen ? 'hl-open' : ''}`} />
                    <span className={`hamburger-line hl-3 ${menuOpen ? 'hl-open' : ''}`} />
                </button>
            </nav>

            {/* Mobile menu overlay */}
            {menuOpen && (
                <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)}>
                    <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
                        <button className="mobile-menu-close" onClick={() => setMenuOpen(false)}>✕</button>
                        <div className="mobile-menu-links">
                            <button onClick={() => { navigate('/safety'); setMenuOpen(false); }}><Icons.Shield size={16} /> Safety Scores</button>
                            <button onClick={() => { navigate('/admin'); setMenuOpen(false); }}><Icons.BarChart size={16} /> Dashboard</button>
                            <button className="mobile-theme-btn" onClick={toggleTheme}>
                                {theme === 'dark' ? <Icons.Moon size={16} /> : <Icons.Sun size={16} />}
                                {theme === 'dark' ? 'Dark' : 'Light'} Mode
                                <span className="mobile-theme-indicator">{theme === 'dark' ? '🌙' : '☀️'}</span>
                            </button>
                            {user ? (
                                <>
                                    <div className="mobile-menu-user">
                                        <div className="user-avatar">{user.username[0]}</div>
                                        <span>{user.username}</span>
                                    </div>
                                    <button className="mobile-menu-logout" onClick={() => { logout(); setMenuOpen(false); }}>Logout</button>
                                </>
                            ) : (
                                <button onClick={() => { navigate('/login'); setMenuOpen(false); }}><Icons.User size={16} /> Login</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Hero Content */}
            <div className="intro-hero">
                {/* Left Side Decorations */}
                <div className="hero-side-decor hero-side-left">
                    <div className="side-float-card sf-card-1">
                        <span className="sf-icon"><Icons.Map size={18} /></span>
                        <span className="sf-label">Smart Routes</span>
                    </div>
                    <div className="side-float-card sf-card-2">
                        <span className="sf-icon"><Icons.MapPin size={18} /></span>
                        <span className="sf-label">Live Tracking</span>
                    </div>
                    <div className="side-orbit-ring side-orbit-1"></div>
                    <div className="side-accent-line sal-1"></div>
                </div>

                {/* Right Side Decorations */}
                <div className="hero-side-decor hero-side-right">
                    <div className="side-float-card sf-card-3">
                        <span className="sf-icon"><Icons.Hospital size={18} /></span>
                        <span className="sf-label">Emergency</span>
                    </div>
                    <div className="side-float-card sf-card-4">
                        <span className="sf-icon"><Icons.ShieldCheck size={18} /></span>
                        <span className="sf-label">AI Safety</span>
                    </div>
                    <div className="side-orbit-ring side-orbit-2"></div>
                    <div className="side-accent-line sal-2"></div>
                </div>

                {/* Badge */}
                <div className={`intro-badge ${visible ? 'anim-in' : ''}`}>
                    <span className="intro-badge-dot"></span>
                    <span className="intro-badge-glow"></span>
                    Version 2.0 — AI-Powered Safety Analysis
                </div>

                {/* Main heading */}
                <h1 className={`intro-heading ${visible ? 'anim-in' : ''}`}>
                    Navigate with{' '}
                    <span className="intro-gradient-text">Confidence</span>
                </h1>

                <p className={`intro-subtext ${visible ? 'anim-in' : ''}`}>
                    NaviX combines AI-powered route analysis with real-time safety scoring
                    and emergency service mapping — so every journey is your safest one.
                </p>

                {/* CTA Buttons */}
                <div className={`intro-cta-row ${visible ? 'anim-in' : ''}`}>
                    <button className="intro-cta-primary" onClick={() => navigate('/home')}>
                        <span className="cta-pulse-ring"></span>
                        Start Navigating
                        <span className="intro-cta-arrow">→</span>
                    </button>
                    <button className="intro-cta-secondary" onClick={() => navigate('/safety')}>
                        <Icons.Shield size={16} /> Explore Safety Scores
                    </button>
                </div>

                {/* Stats */}
                <div
                    ref={statsRef}
                    className={`intro-stats-row ${statsVisible ? 'anim-in' : ''}`}
                >
                    <div className="intro-stat">
                        <span className="intro-stat-num">3</span>
                        <span className="intro-stat-label">Travel Modes</span>
                    </div>
                    <div className="intro-stat-divider"></div>
                    <div className="intro-stat">
                        <span className="intro-stat-num">AI</span>
                        <span className="intro-stat-label">Safety Analysis</span>
                    </div>
                    <div className="intro-stat-divider"></div>
                    <div className="intro-stat">
                        <span className="intro-stat-num">24/7</span>
                        <span className="intro-stat-label">Emergency Help</span>
                    </div>
                </div>
            </div>

            {/* Feature Cards */}
            <div
                ref={featuresRef}
                className={`intro-features ${featuresVisible ? 'features-visible' : ''}`}
            >
                <div className="intro-feature-card card-delay-1">
                    <div className="intro-feature-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}><Icons.Route size={24} /></div>
                    <h3>AI Smart Routing</h3>
                    <p>Intelligent route optimization with safety-verified waypoints and real-time hazard avoidance</p>
                    <div className="feature-card-shine"></div>
                </div>
                <div className="intro-feature-card card-delay-2">
                    <div className="intro-feature-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}><Icons.Hospital size={24} /></div>
                    <h3>Emergency Services</h3>
                    <p>Instantly locate nearest hospitals and police stations with one-tap navigation</p>
                    <div className="feature-card-shine"></div>
                </div>
                <div className="intro-feature-card card-delay-3">
                    <div className="intro-feature-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}><Icons.BarChart size={24} /></div>
                    <h3>Safety Analytics</h3>
                    <p>Data-driven safety scores for every subdistrict based on infrastructure density</p>
                    <div className="feature-card-shine"></div>
                </div>
            </div>

            {/* How It Works */}
            <div
                ref={stepsRef}
                className={`intro-how-section ${stepsVisible ? 'steps-visible' : ''}`}
            >
                <h2 className="intro-section-title">
                    How It <span className="intro-gradient-text">Works</span>
                </h2>
                <p className="intro-section-sub">Three simple steps to safer navigation</p>

                <div className="intro-steps-row">
                    <div className="intro-step step-delay-1">
                        <div className="step-number">01</div>
                        <div className="step-icon-wrap">
                            <div className="step-icon"><Icons.MapPin size={22} /></div>
                            <div className="step-icon-ring"></div>
                        </div>
                        <h3>Enter Locations</h3>
                        <p>Type your start and destination with smart autocomplete suggestions</p>
                    </div>
                    <div className="intro-step-connector">
                        <div className="connector-line"></div>
                        <div className="connector-dot"></div>
                    </div>
                    <div className="intro-step step-delay-2">
                        <div className="step-number">02</div>
                        <div className="step-icon-wrap">
                            <div className="step-icon"><Icons.Cpu size={22} /></div>
                            <div className="step-icon-ring"></div>
                        </div>
                        <h3>AI Analyzes Safety</h3>
                        <p>Our AI evaluates route safety, adds waypoints near hospitals & police</p>
                    </div>
                    <div className="intro-step-connector">
                        <div className="connector-line"></div>
                        <div className="connector-dot"></div>
                    </div>
                    <div className="intro-step step-delay-3">
                        <div className="step-number">03</div>
                        <div className="step-icon-wrap">
                            <div className="step-icon"><Icons.ShieldCheck size={22} /></div>
                            <div className="step-icon-ring"></div>
                        </div>
                        <h3>Navigate Safely</h3>
                        <p>Follow your optimized route with turn-by-turn directions & live tracking</p>
                    </div>
                </div>
            </div>

            {/* Developer Card Section */}
            <div className="dev-section">
                <div className="dev-section-heading">
                    <h2>Meet the Creator</h2>
                    <p>The passionate developer behind NaviX</p>
                </div>

                <div className="dev-card">
                    <div className="dev-card-glow"></div>
                    <div className="dev-card-inner">
                        <div className="dev-profile-row">
                            <div className="dev-avatar-wrap">
                                <div className="dev-avatar"><img src="/developer.jpeg" alt="Nishtha" className="dev-avatar-img" /></div>
                                <span className="dev-status-dot" title="Available for work"></span>
                            </div>
                            <div className="dev-profile-info">
                                <h3 className="dev-name">Nishtha</h3>
                                <span className="dev-title">Full Stack Developer</span>
                                <span className="dev-status-badge"><span className="status-online-dot"></span> Available for Collaboration</span>
                            </div>
                        </div>

                        <p className="dev-description">
                            Passionate about creating meaningful digital experiences that connect people. Built NaviX with love using modern web technologies to make travel more personal, authentic, and safe.
                        </p>

                        <div className="dev-tech-stack">
                            <span className="dev-tech-chip">React</span>
                            <span className="dev-tech-chip">Node.js</span>
                            <span className="dev-tech-chip">MERN Stack</span>
                            <span className="dev-tech-chip">AI/ML</span>
                            <span className="dev-tech-chip">REST APIs</span>
                        </div>

                        <div className="dev-stats-row">
                            <div className="dev-stat">
                                <span className="dev-stat-value">5+</span>
                                <span className="dev-stat-label">Projects</span>
                            </div>
                            <div className="dev-stat-divider"></div>
                            <div className="dev-stat">
                                <span className="dev-stat-value">10+</span>
                                <span className="dev-stat-label">Technologies</span>
                            </div>
                            <div className="dev-stat-divider"></div>
                            <div className="dev-stat">
                                <span className="dev-stat-value">∞</span>
                                <span className="dev-stat-label">Curiosity</span>
                            </div>
                        </div>

                        <div className="dev-links-row">
                            <a href="https://linkedin.com/in/nishthadhawan27/" target="_blank" rel="noreferrer" className="dev-pill dev-linkedin">
                                <svg className="pill-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                                LinkedIn
                            </a>
                            <a href="mailto:nishthadhawan30@gmail.com" target="_blank" rel="noreferrer" className="dev-pill dev-email">
                                <svg className="pill-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
                                Contact
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="intro-footer">
                <p>NaviX © 2026 · Built for safer journeys</p>
            </footer>
        </div>
    );
}
