import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { initErrorReporter } from './utils/errorReporter.js';

// ── Self-hosted error monitoring (free, no Sentry) ────────────────────────────
// Catches window.onerror, unhandled promise rejections, and React crashes.
// All errors are saved to your own PostgreSQL DB and emailed to you.
initErrorReporter();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
