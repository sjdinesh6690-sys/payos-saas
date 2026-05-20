// errorReporter.js — Self-hosted error monitoring (no Sentry, completely free)
// Catches unhandled JS errors and promise rejections, sends them to your backend.

const REPORT_URL = '/api/errors/log';

// Deduplicate: don't send the same error twice within 10 seconds
const recentErrors = new Map();

function isDuplicate(message) {
  const now = Date.now();
  if (recentErrors.has(message) && now - recentErrors.get(message) < 10_000) return true;
  recentErrors.set(message, now);
  // Clean up old entries
  for (const [k, t] of recentErrors) if (now - t > 60_000) recentErrors.delete(k);
  return false;
}

function getAdminId() {
  try {
    const token = localStorage.getItem('payslip_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id || null;
  } catch { return null; }
}

function sendError({ severity = 'error', message, stack, context = {} }) {
  if (isDuplicate(message)) return;

  const payload = {
    source:     'frontend',
    severity,
    message:    String(message).slice(0, 1000),
    stack:      stack ? String(stack).slice(0, 4000) : null,
    url:        window.location.href,
    user_agent: navigator.userAgent,
    admin_id:   getAdminId(),
    context,
  };

  // Use sendBeacon so it works even when the page is closing
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon(REPORT_URL, blob);
  } else {
    fetch(REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {}); // Silently ignore if network is down
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Call this from catch blocks to report a known error with context */
export function reportError(error, context = {}) {
  const message = error?.message || String(error);
  const stack   = error?.stack   || null;
  sendError({ severity: 'error', message, stack, context });
}

/** Report a warning (non-critical issue) */
export function reportWarning(message, context = {}) {
  sendError({ severity: 'warning', message: String(message), context });
}

// ── Global handlers (set up once in main.jsx) ─────────────────────────────────

export function initErrorReporter() {
  // Catch all unhandled JS errors (e.g. null reference, type errors)
  window.onerror = (message, source, lineno, colno, error) => {
    sendError({
      severity: 'error',
      message:  String(message),
      stack:    error?.stack || `at ${source}:${lineno}:${colno}`,
      context:  { lineno, colno, source },
    });
    return false; // Don't suppress browser's own error output
  };

  // Catch unhandled promise rejections (e.g. failed API calls)
  window.onunhandledrejection = (event) => {
    const reason  = event.reason;
    const message = reason?.message || String(reason) || 'Unhandled promise rejection';
    const stack   = reason?.stack   || null;
    sendError({ severity: 'error', message, stack, context: { type: 'unhandledrejection' } });
  };

  // Catch console.error calls — useful for catching React warnings that become errors
  const origConsoleError = console.error.bind(console);
  console.error = (...args) => {
    origConsoleError(...args);
    const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    // Only report React error boundary errors, not routine ones
    if (message.includes('The above error occurred') || message.includes('React will try to recreate')) {
      sendError({ severity: 'error', message: message.slice(0, 500), context: { type: 'react' } });
    }
  };
}
