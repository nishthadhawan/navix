/**
 * useShakeDetect — Custom hook for shake-to-call detection
 * Uses DeviceMotionEvent to detect rapid shaking (3 shakes).
 * Handles iOS 13+ permission request automatically.
 *
 * Usage:
 *   useShakeDetect(enabled, onShake);
 */

import { useEffect, useRef, useCallback } from 'react';

const SHAKE_THRESHOLD = 25;      // acceleration threshold (m/s²)
const SHAKE_COUNT_NEEDED = 3;    // number of shakes to trigger
const SHAKE_WINDOW = 1500;       // time window for shakes (ms)
const COOLDOWN = 5000;           // cooldown after trigger (ms)

export default function useShakeDetect(enabled, onShake) {
    const shakesRef = useRef([]);
    const lastTriggerRef = useRef(0);
    const permissionGrantedRef = useRef(false);

    const handleMotion = useCallback((e) => {
        const acc = e.accelerationIncludingGravity;
        if (!acc) return;

        const total = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
        const now = Date.now();

        // Ignore if in cooldown
        if (now - lastTriggerRef.current < COOLDOWN) return;

        if (total > SHAKE_THRESHOLD) {
            // Add shake timestamp
            shakesRef.current.push(now);

            // Remove old shakes outside the window
            shakesRef.current = shakesRef.current.filter(t => now - t < SHAKE_WINDOW);

            // Check if enough shakes detected
            if (shakesRef.current.length >= SHAKE_COUNT_NEEDED) {
                shakesRef.current = [];
                lastTriggerRef.current = now;
                onShake?.();
            }
        }
    }, [onShake]);

    useEffect(() => {
        if (!enabled) return;
        if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;

        // iOS 13+ requires permission
        const requestPermission = async () => {
            if (typeof DeviceMotionEvent.requestPermission === 'function') {
                try {
                    const result = await DeviceMotionEvent.requestPermission();
                    if (result === 'granted') {
                        permissionGrantedRef.current = true;
                        window.addEventListener('devicemotion', handleMotion);
                    }
                } catch {
                    // Permission denied or error
                }
            } else {
                // Android / non-iOS — no permission needed
                permissionGrantedRef.current = true;
                window.addEventListener('devicemotion', handleMotion);
            }
        };

        requestPermission();

        return () => {
            window.removeEventListener('devicemotion', handleMotion);
        };
    }, [enabled, handleMotion]);
}
