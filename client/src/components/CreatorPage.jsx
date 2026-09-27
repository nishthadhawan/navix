/**
 * CreatorPage — Premium "Meet the Creator" standalone page
 * Beautiful full-page profile with photo, bio, tech stack, stats, and social links.
 */

import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Icons from './Icons';

export default function CreatorPage() {
    const navigate = useNavigate();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setTimeout(() => setVisible(true), 100);
    }, []);

    return (
        <div className="creator-page">
            {/* Animated Background */}
            <div className="bg-orbs">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>
            <div className="creator-grid-bg"></div>

            {/* Floating particles */}
            <div className="creator-particles">
                <div className="cp cp-1"></div>
                <div className="cp cp-2"></div>
                <div className="cp cp-3"></div>
                <div className="cp cp-4"></div>
                <div className="cp cp-5"></div>
                <div className="cp cp-6"></div>
            </div>

            {/* Top Nav */}
            <nav className="creator-nav">
                <a href="/" className="creator-nav-brand">
                    <img src="/logo.png" alt="NaviX" className="creator-nav-logo" />
                    <span className="creator-nav-name">NaviX</span>
                </a>
                <button className="creator-back-btn" onClick={() => navigate('/home')}>
                    <Icons.ArrowLeft size={14} /> Back to Home
                </button>
            </nav>

            {/* Hero Section */}
            <div className={`creator-hero ${visible ? 'creator-visible' : ''}`}>
                {/* Photo Section */}
                <div className="creator-photo-section">
                    <div className="creator-photo-glow"></div>
                    <div className="creator-photo-ring">
                        <div className="creator-photo-ring-inner">
                            <img
                                src="/developer.jpeg"
                                alt="Nishtha — Creator of NaviX"
                                className="creator-photo"
                            />
                        </div>
                        <span className="creator-online-dot" title="Available for work"></span>
                    </div>
                    <div className="creator-photo-label">
                        <Icons.ShieldCheck size={12} /> Verified Creator
                    </div>
                </div>

                {/* Info Section */}
                <div className="creator-info">
                    <div className="creator-badge">
                        <span className="creator-badge-dot"></span>
                        The Mind Behind NaviX
                    </div>

                    <h1 className="creator-name">
                        Nishtha <span className="creator-name-accent">Kumar </span> Yadav
                    </h1>

                    <p className="creator-role">
                        <Icons.Code size={16} /> Full Stack Developer &amp; AI Enthusiast
                    </p>

                    <p className="creator-bio">
                        Passionate about building meaningful digital experiences that make a real impact. 
                        Created NaviX to make every journey safer using AI-powered route analysis, 
                        real-time safety scoring, and emergency service mapping — because everyone 
                        deserves to travel with confidence.
                    </p>

                    {/* Tech Stack */}
                    <div className="creator-tech">
                        <span className="creator-tech-label">Tech Stack</span>
                        <div className="creator-tech-chips">
                            <span className="creator-chip">
                                <span className="chip-icon">⚛️</span> React
                            </span>
                            <span className="creator-chip">
                                <span className="chip-icon">🟩</span> Node.js
                            </span>
                            <span className="creator-chip">
                                <span className="chip-icon">🍃</span> MongoDB
                            </span>
                            <span className="creator-chip">
                                <span className="chip-icon">🤖</span> AI / ML
                            </span>
                            <span className="creator-chip">
                                <span className="chip-icon">🗺️</span> Mapbox
                            </span>
                            <span className="creator-chip">
                                <span className="chip-icon">🌐</span> REST APIs
                            </span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="creator-stats">
                        <div className="creator-stat">
                            <span className="creator-stat-val">5+</span>
                            <span className="creator-stat-lbl">Projects Built</span>
                        </div>
                        <div className="creator-stat-sep"></div>
                        <div className="creator-stat">
                            <span className="creator-stat-val">10+</span>
                            <span className="creator-stat-lbl">Technologies</span>
                        </div>
                        <div className="creator-stat-sep"></div>
                        <div className="creator-stat">
                            <span className="creator-stat-val">∞</span>
                            <span className="creator-stat-lbl">Curiosity</span>
                        </div>
                    </div>

                    {/* Social Links */}
                    <div className="creator-socials">
                        <a href="https://linkedin.com/in/nishthadhawan27" target="_blank" rel="noreferrer" className="creator-social creator-social--linkedin">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="creator-social-icon"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                            LinkedIn
                        </a>
                        <a href="https://github.com/nishthadhawan" target="_blank" rel="noreferrer" className="creator-social creator-social--github">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="creator-social-icon"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                            GitHub
                        </a>
                        <a href="mailto:nishthadhawan30@gmail.com" target="_blank" rel="noreferrer" className="creator-social creator-social--email">
                            <Icons.Mail size={16} />
                            Contact
                        </a>
                    </div>
                </div>
            </div>

            {/* Quote Section */}
            <div className={`creator-quote-section ${visible ? 'creator-visible' : ''}`}>
                <div className="creator-quote-card">
                    <div className="creator-quote-mark">"</div>
                    <p className="creator-quote-text">
                        Technology should empower people. With NaviX, I wanted to prove that 
                        a single developer can build something that makes every journey safer for everyone.
                    </p>
                    <span className="creator-quote-author">— Nishtha, Creator of NaviX</span>
                </div>
            </div>

            {/* Footer */}
            <footer className="creator-footer">
                <p>NaviX © 2026 · Built with ❤️ for safer journeys</p>
            </footer>
        </div>
    );
}
