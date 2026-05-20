// ErrorBoundary.jsx — Catches React render errors and shows a friendly screen
// instead of a blank white page. Also reports the error to your backend.

import { Component } from 'react';
import { reportError } from '@/utils/errorReporter';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    reportError(error, {
      type:           'react_boundary',
      componentStack: info?.componentStack?.slice(0, 1000),
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#F8FAFC', padding: 24,
      }}>
        <div style={{
          background: 'white', borderRadius: 16, padding: '40px 32px',
          maxWidth: 480, width: '100%', textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0',
        }}>
          {/* Icon */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#FEF2F2', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <svg viewBox="0 0 24 24" fill="none" width={32} height={32}>
              <circle cx="12" cy="12" r="10" stroke="#DC2626" strokeWidth="1.8"/>
              <path d="M12 7v5" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1" fill="#DC2626"/>
            </svg>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 24 }}>
            We're sorry — a part of the page crashed. This error has been automatically reported to our team and we'll fix it soon.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px', borderRadius: 10, fontWeight: 600,
                fontSize: 14, background: '#1A7A4A', color: 'white',
                border: 'none', cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
            <button
              onClick={() => { window.location.href = '/admin/dashboard'; }}
              style={{
                padding: '10px 20px', borderRadius: 10, fontWeight: 600,
                fontSize: 14, background: 'white', color: '#475569',
                border: '1px solid #E2E8F0', cursor: 'pointer',
              }}
            >
              Go to Dashboard
            </button>
          </div>

          {/* Show error message in dev mode */}
          {import.meta.env.DEV && this.state.error && (
            <details style={{ marginTop: 24, textAlign: 'left' }}>
              <summary style={{ fontSize: 12, color: '#94A3B8', cursor: 'pointer' }}>
                Developer details
              </summary>
              <pre style={{
                marginTop: 8, fontSize: 11, color: '#DC2626',
                background: '#FEF2F2', padding: '10px 12px',
                borderRadius: 8, overflow: 'auto', maxHeight: 200,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {this.state.error.stack || this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
