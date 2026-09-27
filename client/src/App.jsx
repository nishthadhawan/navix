/**
 * App.jsx - Home page for NaviX
 * Premium layout with hero header, route form, and nearby services.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import RouteForm from './components/RouteForm';
import NearbySearch from './components/NearbySearch';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import Icons from './components/Icons';

const API_URL = 'https://navix-backend-uly4.onrender.com/api';
const ADMIN_ID = '69c2e46f3e2c7b09c8291257';

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingStep, setLoadingStep] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [navDropOpen, setNavDropOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleRouteSubmit = async ({ start, end, profile }) => {
    setIsLoading(true);
    setError(null);

    try {
      setLoadingStep('Geocoding locations...');
      const response = await axios.post(`${API_URL}/route`, { start, end, profile }, { timeout: 120000 });
      sessionStorage.setItem('safeRouteData', JSON.stringify(response.data));
      navigate('/navigate');
      setLoadingStep('');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'An unexpected error occurred.');
      setLoadingStep('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNearbyRouteRequest = async ({ startLat, startLon, endLat, endLon, endName }) => {
    setIsLoading(true);
    setError(null);

    try {
      setLoadingStep(`Routing to ${endName}...`);
      const response = await axios.post(`${API_URL}/route`, {
        start: `${startLat},${startLon}`,
        end: `${endLat},${endLon}`,
        profile: 'driving-car',
      }, { timeout: 120000 });
      sessionStorage.setItem('safeRouteData', JSON.stringify(response.data));
      navigate('/navigate');
      setLoadingStep('');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to generate route.');
      setLoadingStep('');
    } finally {
      setIsLoading(false);
    }
  };

  const shareLocation = async () => {
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      const navixUrl = `https://navix-frontend.onrender.com/?locate=${latitude},${longitude}`;
      const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
      const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const shareText = [
        `🧭 NaviX — Safe Navigation`,
        ``,
        `📍 My Current Location`,
        `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        `🕐 ${time}`,
        ``,
        `Open in NaviX 🗺️`,
        navixUrl,
        ``,
        `Open in Google Maps 🔗`,
        mapsUrl,
      ].join('\n');

      if (navigator.share) {
        await navigator.share({ title: 'My Location — NaviX', text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('📋 Location link copied to clipboard!');
      }
    } catch (err) {
      if (err.name === 'GeolocationPositionError' || err.code) {
        alert('⚠️ Unable to get your location. Please enable location access in your browser settings.');
      }
    }
  };

  return (
    <>
      {/* Background */}
      <div className="bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      {/* Top Navigation Bar — full width */}
      <nav className="nav-bar">
        <a href="/" className="nav-brand" style={{ textDecoration: 'none', color: 'inherit' }}>
          <img src="/logo.png" alt="NaviX" className="nav-logo" />
          <span className="nav-name">NaviX</span>
        </a>

        {/* Desktop nav */}
        <div className="nav-actions nav-desktop">
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
            </div>
          ) : (
            <button className="nav-btn" onClick={() => navigate('/login')}><Icons.User size={16} /> Login</button>
          )}

          {/* Dropdown menu — all pages + logout */}
          <div className="nav-dropdown-wrap">
            <button className="nav-btn nav-menu-trigger" onClick={() => setNavDropOpen(!navDropOpen)}>
              <Icons.Menu size={16} /> Menu
              <span className={`nav-drop-chevron ${navDropOpen ? 'nav-drop-chevron--open' : ''}`}>
                <Icons.ChevronRight size={12} />
              </span>
            </button>
            {navDropOpen && (
              <>
                <div className="nav-dropdown-backdrop" onClick={() => setNavDropOpen(false)} />
                <div className="nav-dropdown">
                  {user && (
                    <button className="nav-drop-item" onClick={() => { navigate('/profile'); setNavDropOpen(false); }}>
                      <Icons.User size={15} /> Profile
                    </button>
                  )}
                  <button className="nav-drop-item" onClick={() => { navigate('/'); setNavDropOpen(false); }}>
                    <Icons.Home size={15} /> Home
                  </button>
                  <button className="nav-drop-item" onClick={() => { navigate('/safety'); setNavDropOpen(false); }}>
                    <Icons.Shield size={15} /> Safety Scores
                  </button>
                  <button className="nav-drop-item" onClick={() => { navigate('/admin'); setNavDropOpen(false); }}>
                    <Icons.BarChart size={15} /> Admin
                  </button>
                  {user && user.id === ADMIN_ID && (
                    <button className="nav-drop-item" onClick={() => { navigate('/users'); setNavDropOpen(false); }}>
                      <Icons.Users size={15} /> Users
                    </button>
                  )}
                  <button className="nav-drop-item" onClick={() => { navigate('/paths'); setNavDropOpen(false); }}>
                    <Icons.Bookmark size={15} /> My Paths
                  </button>
                  <div className="nav-drop-divider" />
                  <button className="nav-drop-item" onClick={() => { shareLocation(); setNavDropOpen(false); }}>
                    <Icons.Share2 size={15} /> Share Location
                  </button>
                  <button className="nav-drop-item" onClick={() => { navigate('/creator'); setNavDropOpen(false); }}>
                    <Icons.Award size={15} /> Creator
                  </button>
                  <button className="nav-drop-item" onClick={() => { navigate('/emergency'); setNavDropOpen(false); }}>
                    <Icons.Phone size={15} /> Emergency
                  </button>
                  {user && (
                    <>
                      <div className="nav-drop-divider" />
                      <button className="nav-drop-item nav-drop-logout" onClick={() => { logout(); setNavDropOpen(false); }}>
                        <Icons.LogOut size={15} /> Logout
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

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
              {user && (
                <button onClick={() => { navigate('/profile'); setMenuOpen(false); }}><Icons.User size={16} /> Profile</button>
              )}
              <button onClick={() => { navigate('/'); setMenuOpen(false); }}><Icons.Home size={16} /> Home</button>
              <button onClick={() => { navigate('/safety'); setMenuOpen(false); }}><Icons.Shield size={16} /> Safety Scores</button>
              <button onClick={() => { navigate('/admin'); setMenuOpen(false); }}><Icons.BarChart size={16} /> Admin</button>
              {user && user.id === ADMIN_ID && (
                <button onClick={() => { navigate('/users'); setMenuOpen(false); }}><Icons.Users size={16} /> Users</button>
              )}
              <button onClick={() => { navigate('/paths'); setMenuOpen(false); }}><Icons.Bookmark size={16} /> My Paths</button>
              <button onClick={() => { navigate('/creator'); setMenuOpen(false); }}><Icons.Award size={16} /> Creator</button>
              <button onClick={() => { navigate('/emergency'); setMenuOpen(false); }}><Icons.Phone size={16} /> Emergency</button>
              <button onClick={() => { shareLocation(); setMenuOpen(false); }}><Icons.Share2 size={16} /> Share Location</button>
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

      {/* Hero Section */}
      <div className="app">
      <section className="hero">
        <div className="hero-badge"><Icons.ShieldCheck size={14} /> AI-Powered Safety</div>
        <h1 className="hero-title">
          Navigate <span className="hero-accent">Safely</span>, Anywhere
        </h1>
        <p className="hero-subtitle">
          Smart route planning with real-time safety analysis, AI-verified waypoints, and nearby emergency services — all in one place
        </p>
        <div className="hero-features">
          <div className="hero-feature">
            <span><Icons.Map size={16} /></span> Smart Routes
          </div>
          <div className="hero-feature">
            <span><Icons.Cpu size={16} /></span> AI Safety
          </div>
          <div className="hero-feature">
            <span><Icons.Hospital size={16} /></span> Nearby Help
          </div>
          <div className="hero-feature">
            <span><Icons.BarChart size={16} /></span> Safety Scores
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="home-grid">
        <div className="home-card">
          <RouteForm onSubmit={handleRouteSubmit} isLoading={isLoading} />
        </div>

        <div className="home-card">
          <div className="glass-card services-card">
            <NearbySearch onRouteRequest={handleNearbyRouteRequest} isLoading={isLoading} />
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="home-loading">
          <div className="glass-card loading-overlay">
            <div className="large-spinner"></div>
            <p>Generating your safest route...</p>
            <div className="loading-steps">
              <div className="loading-step active">📍 {loadingStep || 'Processing...'}</div>
              <div className="loading-step">🛣️ Calculating optimal route</div>
              <div className="loading-step">🤖 AI analyzing safety factors</div>
              <div className="loading-step">🏥 Mapping nearby hospitals & police</div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-msg home-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="home-footer">
        <p>NaviX © 2026 · AI-Powered Safe Navigation</p>
      </footer>
      </div>
    </>
  );
}
