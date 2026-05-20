// ErrorMonitorPage.jsx — Super Admin error log viewer
// Shows all frontend + backend errors, with stack traces and resolve controls.

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, CheckCircle2, RefreshCw, Trash2, Monitor, Server,
  Clock, ChevronDown, ChevronUp, AlertCircle, Info,
} from 'lucide-react';

const SEV_COLOR = {
  error:   { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', dot: '#DC2626' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', dot: '#F59E0B' },
  info:    { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', dot: '#3B82F6' },
};

function Badge({ label, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: color.bg, color: color.text, border: `1px solid ${color.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color.dot }} />
      {label}
    </span>
  );
}

function ErrorRow({ err, onResolve }) {
  const [open, setOpen] = useState(false);
  const sev  = SEV_COLOR[err.severity] || SEV_COLOR.error;
  const date = new Date(err.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div style={{
      border: `1px solid ${err.resolved ? '#E2E8F0' : sev.border}`,
      borderRadius: 10, marginBottom: 8, overflow: 'hidden',
      opacity: err.resolved ? 0.55 : 1,
      background: err.resolved ? '#F8FAFC' : sev.bg,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          {err.source === 'backend'
            ? <Server size={15} color={sev.text} />
            : <Monitor size={15} color={sev.text} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <Badge label={err.severity.toUpperCase()} color={sev} />
            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {err.source}
            </span>
            {err.company_name && (
              <span style={{ fontSize: 11, color: '#94A3B8' }}>· {err.company_name}</span>
            )}
            <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={10} /> {date}
            </span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0, wordBreak: 'break-word' }}>
            {err.message}
          </p>
          {err.url && (
            <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0', wordBreak: 'break-all' }}>{err.url}</p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {!err.resolved && (
            <button onClick={() => onResolve(err.id)} title="Mark resolved" style={{
              padding: '4px 8px', borderRadius: 6, border: '1px solid #D1FAE5',
              background: '#F0FDF4', color: '#16A34A', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            }}>
              Resolve
            </button>
          )}
          {err.stack && (
            <button onClick={() => setOpen(o => !o)} style={{
              padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0',
              background: 'white', color: '#64748B', cursor: 'pointer',
            }}>
              {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Stack trace */}
      {open && err.stack && (
        <div style={{ borderTop: `1px solid ${sev.border}`, padding: '12px 16px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Stack Trace</p>
          <pre style={{
            fontSize: 11, color: '#374151', background: 'white',
            padding: '10px 12px', borderRadius: 8, overflow: 'auto',
            maxHeight: 240, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            border: '1px solid #E2E8F0', margin: 0,
          }}>
            {err.stack}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function ErrorMonitorPage() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState({ source: '', severity: '', resolved: 'false' });
  const token = localStorage.getItem('super_admin_token');

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.source)   params.set('source', filter.source);
      if (filter.severity) params.set('severity', filter.severity);
      if (filter.resolved) params.set('resolved', filter.resolved);
      params.set('limit', '200');

      const res  = await fetch(`/api/errors?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setData(json);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [filter, token]);

  useEffect(() => { fetchErrors(); }, [fetchErrors]);

  const handleResolve = async (id) => {
    await fetch(`/api/errors/${id}/resolve`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}` },
    });
    fetchErrors();
  };

  const handleClearResolved = async () => {
    if (!confirm('Delete all resolved errors?')) return;
    await fetch('/api/errors/clear-resolved', {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    fetchErrors();
  };

  const summary = data?.summary || {};
  const errors  = data?.errors  || [];

  const statCards = [
    { label: 'Open Errors',    value: summary.open_errors    || 0, icon: AlertCircle,  color: '#DC2626' },
    { label: 'Open Warnings',  value: summary.open_warnings  || 0, icon: AlertTriangle, color: '#D97706' },
    { label: 'Last 24 hours',  value: summary.last_24h       || 0, icon: Clock,         color: '#7C3AED' },
    { label: 'Frontend Issues',value: summary.frontend_total || 0, icon: Monitor,       color: '#0284C7' },
    { label: 'Backend Issues', value: summary.backend_total  || 0, icon: Server,        color: '#059669' },
  ];

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Error Monitor</h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            All frontend & backend errors — self-hosted, free, real-time
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchErrors} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            borderRadius: 8, border: '1px solid #E2E8F0', background: 'white',
            color: '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={handleClearResolved} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2',
            color: '#DC2626', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            <Trash2 size={14} /> Clear Resolved
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 24 }}>
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{
            background: 'white', border: '1px solid #E2E8F0', borderRadius: 10,
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {[
          { key: 'source',   label: 'Source',   options: [['','All Sources'],['frontend','Frontend'],['backend','Backend']] },
          { key: 'severity', label: 'Severity', options: [['','All'],['error','Error'],['warning','Warning'],['info','Info']] },
          { key: 'resolved', label: 'Status',   options: [['false','Open'],['true','Resolved'],['','All']] },
        ].map(({ key, options }) => (
          <select key={key} value={filter[key]}
            onChange={e => setFilter(f => ({ ...f, [key]: e.target.value }))}
            style={{
              padding: '7px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
              background: 'white', color: '#374151', fontSize: 13, cursor: 'pointer',
            }}>
            {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
          </select>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#94A3B8', alignSelf: 'center' }}>
          {errors.length} result{errors.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Error list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
          <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
          Loading errors…
        </div>
      ) : errors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
          <CheckCircle2 size={40} style={{ margin: '0 auto 12px', display: 'block', color: '#86EFAC' }} />
          <p style={{ fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>No errors found</p>
          <p style={{ fontSize: 13 }}>Your app is running clean.</p>
        </div>
      ) : (
        <div>
          {errors.map(err => (
            <ErrorRow key={err.id} err={err} onResolve={handleResolve} />
          ))}
        </div>
      )}
    </div>
  );
}
