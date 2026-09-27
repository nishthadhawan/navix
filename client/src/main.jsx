/**
 * main.jsx - Entry point with React Router
 * Routes: / = Intro, /home = App, /navigate = Route, /login = Auth
 * Wrapped with AuthProvider for authentication state
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import App from './App.jsx';
import RoutePage from './components/RoutePage.jsx';
import IntroPage from './components/IntroPage.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import SafetyDashboard from './components/SafetyDashboard.jsx';
import UserPanel from './components/UserPanel.jsx';
import SavedPathsPage from './components/SavedPathsPage.jsx';
import CreatorPage from './components/CreatorPage.jsx';
import TrackPage from './components/TrackPage.jsx';
import EmergencyPage from './components/EmergencyPage.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import AuthPage from './components/AuthPage.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import './styles/index.css';

// Protected route wrapper — redirects to /login if not authenticated
function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/" element={<IntroPage />} />
            <Route path="/home" element={<ProtectedRoute><App /></ProtectedRoute>} />
            <Route path="/navigate" element={<ProtectedRoute><RoutePage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><UserPanel /></ProtectedRoute>} />
            <Route path="/paths" element={<ProtectedRoute><SavedPathsPage /></ProtectedRoute>} />
            <Route path="/creator" element={<CreatorPage />} />
            <Route path="/track/:sessionId" element={<TrackPage />} />
            <Route path="/emergency" element={<ProtectedRoute><EmergencyPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/safety" element={<ProtectedRoute><SafetyDashboard /></ProtectedRoute>} />
          </Routes>
          <InstallPrompt />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
