/**
 * InstallPrompt — PWA "Add to Home Screen" banner
 * Captures the browser's beforeinstallprompt event and shows a
 * premium floating banner after a short delay.
 * Dismissals are remembered for 7 days via localStorage.
 */

import { useState, useEffect, useRef } from 'react';
import Icons from './Icons';

const DISMISS_KEY = 'navix_pwa_dismissed';
const DISMISS_DAYS = 7;

export default function InstallPrompt() {
    const [show, setShow] = useState(false);
    const [installing, setInstalling] = useState(false);
    const deferredPrompt = useRef(null);

    useEffect(() => {
        // Check if already dismissed recently
        const dismissed = localStorage.getItem(DISMISS_KEY);
        if (dismissed) {
            const dismissedAt = parseInt(dismissed, 10);
            if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
        }

        // Check if already installed (standalone mode)
        if (window.matchMedia('(display-mode: standalone)').matches) return;

        const handler = (e) => {
            e.preventDefault();
            deferredPrompt.current = e;
            // Show banner after 30 seconds so it doesn't interrupt first impression
            setTimeout(() => setShow(true), 30000);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt.current) return;
        setInstalling(true);
        deferredPrompt.current.prompt();
        const result = await deferredPrompt.current.userChoice;
        if (result.outcome === 'accepted') {
            setShow(false);
        }
        deferredPrompt.current = null;
        setInstalling(false);
    };

    const handleDismiss = () => {
        setShow(false);
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
    };

    if (!show) return null;

    return (
        <div className="pwa-banner">
            <div className="pwa-banner-inner">
                <img src="/logo.png" alt="NaviX" className="pwa-banner-icon" />
                <div className="pwa-banner-text">
                    <strong>Install NaviX</strong>
                    <span>Add to home screen for a faster, app-like experience</span>
                </div>
                <div className="pwa-banner-actions">
                    <button className="pwa-install-btn" onClick={handleInstall} disabled={installing}>
                        {installing ? 'Installing...' : 'Install'}
                    </button>
                    <button className="pwa-dismiss-btn" onClick={handleDismiss} aria-label="Dismiss">
                        <Icons.X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
