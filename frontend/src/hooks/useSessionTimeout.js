/**
 * useSessionTimeout — auto-logout after inactivity
 * Warning at WARN_MINUTES, logout at LOGOUT_MINUTES
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const WARN_MS   = 25 * 60 * 1000; // 25 minutes
const LOGOUT_MS = 30 * 60 * 1000; // 30 minutes
const EVENTS    = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

export function useSessionTimeout({ enabled = true } = {}) {
  const navigate     = useNavigate();
  const warnTimer    = useRef(null);
  const logoutTimer  = useRef(null);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown]     = useState(300); // 5 min countdown
  const countRef     = useRef(null);

  const clearTimers = useCallback(() => {
    clearTimeout(warnTimer.current);
    clearTimeout(logoutTimer.current);
    clearInterval(countRef.current);
  }, []);

  const doLogout = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    localStorage.removeItem('payslip_token');
    localStorage.removeItem('employee_name');
    localStorage.removeItem('user_role');
    navigate('/login?timeout=1', { replace: true });
  }, [clearTimers, navigate]);

  const startTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);

    warnTimer.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(300); // 5-minute countdown until logout
      countRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, WARN_MS);

    logoutTimer.current = setTimeout(doLogout, LOGOUT_MS);
  }, [clearTimers, doLogout]);

  // Keep session alive — called when user clicks "Stay Logged In"
  const keepAlive = useCallback(() => {
    setShowWarning(false);
    clearInterval(countRef.current);
    startTimers();
  }, [startTimers]);

  useEffect(() => {
    if (!enabled) return;

    // Only activate if user is logged in
    const token = localStorage.getItem('payslip_token');
    if (!token) return;

    startTimers();

    const reset = () => startTimers();
    EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));

    return () => {
      clearTimers();
      EVENTS.forEach(e => window.removeEventListener(e, reset));
    };
  }, [enabled, startTimers, clearTimers]);

  const fmtTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return { showWarning, countdown, fmtTime, keepAlive, doLogout };
}
