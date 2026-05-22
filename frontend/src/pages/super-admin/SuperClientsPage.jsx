import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, CheckCircle2, XCircle, AlertCircle, Clock,
  ToggleLeft, ToggleRight, Plus, Zap, TimerOff, CreditCard,
  IndianRupee, Users, FileText, Phone, Calendar, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

const superApi = {
  get:  (path)       => api.get(path, { headers: { Authorization: `Bearer ${localStorage.getItem('payos_super_token')}` } }),
  put:  (path, body) => api.put(path, body,  { headers: { Authorization: `Bearer ${localStorage.getItem('payos_super_token')}` } }),
  post: (path, body) => api.post(path, body, { headers: { Authorization: `Bearer ${localStorage.getItem('payos_super_token')}` } }),
};

const INR  = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const DATE = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function TypeBadge({ type }) {
  const map = {
    paid:    { bg: '#DCFCE7', color: '#15803D', label: '✅ Paid' },
    trial:   { bg: '#FFF7ED', color: '#C2410C', label: '🕐 Trial' },
    expired: { bg: '#FEE2E2', color: '#DC2626', label: '❌ Expired' },
  };
  const s = map[type] || map.trial;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

// ── CLIENT DETAIL PANEL ───────────────────────────────────────────────────────
function ClientDetail({ client, onClose, onRefresh }) {
  const [extendDays,   setExtendDays]   = useState('30');
  const [grantMonths,  setGrantMonths]  = useState('1');
  const [loading,      setLoading]      = useState(false);

  const act = async (label, fn) => {
    setLoading(true);
    try {
      await fn();
      toast.success(label);
      await onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const daysLeft = client.sub_active
    ? Math.max(0, Math.ceil((new Date(client.sub_paid_until) - new Date()) / (1000*60*60*24)))
    : client.trial_active
    ? client.trial_days_remaining
    : 0;

  return (
    <div style={{ width: 380, background: '#fff', borderLeft: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Client Detail</h3>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#F1F5F9', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>×</button>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Avatar + identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: '#E85C2F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 900, flexShrink: 0 }}>
            {(client.company_name || client.email)[0].toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 3 }}>{client.company_name || '—'}</p>
            <p style={{ fontSize: 12, color: '#64748B' }}>{client.email}</p>
            {client.company_phone && client.company_phone !== '—' && (
              <p style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Phone size={11} /> {client.company_phone}
              </p>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <TypeBadge type={client.account_type} />
              <span style={{
                background: client.status === 'active' ? '#DCFCE7' : '#FEE2E2',
                color: client.status === 'active' ? '#15803D' : '#DC2626',
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
              }}>{client.status || 'active'}</span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { icon: Users,        value: client.employee_count, label: 'Employees' },
            { icon: FileText,     value: client.payslip_count,  label: 'Payslips' },
            { icon: IndianRupee,  value: INR(client.total_paid), label: 'Total Paid' },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px 10px', textAlign: 'center', border: '1px solid #F1F5F9' }}>
              <Icon size={14} color="#64748B" style={{ marginBottom: 4 }} />
              <p style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{value}</p>
              <p style={{ fontSize: 10, color: '#94A3B8' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Subscription status */}
        <div style={{ background: client.sub_active ? '#F0FDF4' : client.trial_active ? '#FFFBEB' : '#FEF2F2', borderRadius: 14, padding: '14px 16px', border: `1.5px solid ${client.sub_active ? '#86EFAC' : client.trial_active ? '#FDE68A' : '#FECACA'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 2 }}>
                {client.sub_active
                  ? `Paid Plan — ${client.sub_employee_limit} slots`
                  : client.trial_active
                  ? `Free Trial — ${client.trial_days_remaining} days left`
                  : 'No Active Plan'}
              </p>
              <p style={{ fontSize: 11, color: '#64748B' }}>
                {client.sub_active
                  ? `Valid until ${DATE(client.sub_paid_until)} · ${daysLeft} days left`
                  : client.trial_active
                  ? `Expires ${DATE(client.trial_end_date)}`
                  : 'Trial and subscription both expired'}
              </p>
            </div>
            {client.payment_count > 0 && (
              <span style={{ fontSize: 11, color: '#7C3AED', background: '#F5F3FF', padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>
                {client.payment_count} payments
              </span>
            )}
          </div>
          {(client.sub_active || client.trial_active) && (
            <div style={{ height: 5, background: 'rgba(0,0,0,0.08)', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: client.sub_active ? '#16a34a' : '#D97706',
                width: client.sub_active
                  ? `${Math.min(100, (daysLeft / 31) * 100)}%`
                  : `${Math.min(100, (client.trial_days_remaining / 30) * 100)}%`,
              }} />
            </div>
          )}
        </div>

        {/* ── Grant Subscription ── */}
        <div style={{ border: '1.5px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 7 }}>
            <CreditCard size={14} color="#1A7A4A" />
            <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Grant / Extend Subscription</p>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Grant for how many months?</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['1', '3', '6', '12'].map(m => (
                <button key={m} onClick={() => setGrantMonths(m)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, border: '1.5px solid',
                    borderColor: grantMonths === m ? '#1A7A4A' : '#E2E8F0',
                    background: grantMonths === m ? '#F0FDF4' : '#fff',
                    color: grantMonths === m ? '#1A7A4A' : '#64748B',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}>
                  {m}mo
                </button>
              ))}
            </div>
            <button
              disabled={loading}
              onClick={() => act(`Subscription granted for ${grantMonths} month(s)`,
                () => superApi.put(`/super-admin/clients/${client.id}/subscription`, { months: parseInt(grantMonths) })
              )}
              style={{
                padding: '10px 0', borderRadius: 10, border: 'none',
                background: '#1A7A4A', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={13} />}
              Grant {grantMonths} Month{grantMonths !== '1' ? 's' : ''} Free
            </button>
          </div>
        </div>

        {/* ── Trial management ── */}
        <div style={{ border: '1.5px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Clock size={14} color="#D97706" />
            <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Trial Management</p>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Extend trial by</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              {['7', '14', '30', '60'].map(d => (
                <button key={d} onClick={() => setExtendDays(d)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, border: '1.5px solid',
                    borderColor: extendDays === d ? '#D97706' : '#E2E8F0',
                    background: extendDays === d ? '#FFFBEB' : '#fff',
                    color: extendDays === d ? '#D97706' : '#64748B',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>
                  {d}d
                </button>
              ))}
            </div>
            <button
              disabled={loading}
              onClick={() => act(`Trial extended by ${extendDays} days`,
                () => superApi.put(`/super-admin/clients/${client.id}/trial`, { action: 'extend', days: parseInt(extendDays) })
              )}
              style={{
                padding: '9px 0', borderRadius: 10, border: '1.5px solid #D97706',
                background: '#FFFBEB', color: '#D97706', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Plus size={12} /> Extend Trial
            </button>
            <button
              disabled={loading}
              onClick={() => act('Fresh 30-day trial given',
                () => superApi.put(`/super-admin/clients/${client.id}/trial`, { action: 'activate', days: 30 })
              )}
              style={{
                padding: '9px 0', borderRadius: 10, border: '1.5px solid #86EFAC',
                background: '#F0FDF4', color: '#15803D', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Zap size={12} /> Give Fresh 30-Day Trial
            </button>
            <button
              disabled={loading}
              onClick={() => {
                if (!window.confirm('Force expire this trial immediately?')) return;
                act('Trial expired', () => superApi.put(`/super-admin/clients/${client.id}/trial`, { action: 'expire' }));
              }}
              style={{
                padding: '9px 0', borderRadius: 10, border: '1.5px solid #FECACA',
                background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <TimerOff size={12} /> Force Expire Now
            </button>
          </div>
        </div>

        {/* Account actions */}
        <div style={{ border: '1.5px solid #E2E8F0', borderRadius: 14, padding: '14px 16px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 10 }}>ACCOUNT ACTIONS</p>
          <button
            disabled={loading}
            onClick={() => {
              const newStatus = client.status === 'active' ? 'suspended' : 'active';
              if (newStatus === 'suspended' && !window.confirm('Suspend this client? They won\'t be able to login.')) return;
              act(`Client ${newStatus}`,
                () => superApi.put(`/super-admin/clients/${client.id}/status`, { status: newStatus })
              );
            }}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 10, border: '1.5px solid',
              borderColor: client.status === 'active' ? '#FECACA' : '#86EFAC',
              background: client.status === 'active' ? '#FEF2F2' : '#F0FDF4',
              color: client.status === 'active' ? '#DC2626' : '#15803D',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            {client.status === 'active'
              ? <><XCircle size={14} /> Suspend Client</>
              : <><CheckCircle2 size={14} /> Activate Client</>}
          </button>
        </div>

        {/* Dates */}
        <div style={{ fontSize: 12, color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Registered</span><strong style={{ color: '#64748B' }}>{DATE(client.created_at)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Last Active</span><strong style={{ color: '#64748B' }}>{DATE(client.last_active)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Last Payslip</span><strong style={{ color: '#64748B' }}>{DATE(client.last_payslip)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Last Payment</span><strong style={{ color: '#64748B' }}>{DATE(client.last_payment_at)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Onboarding</span>
            <strong style={{ color: client.onboarding_completed ? '#15803D' : '#D97706' }}>
              {client.onboarding_completed ? '✅ Done' : '⏳ Pending'}
            </strong>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function SuperClientsPage() {
  const qc = useQueryClient();
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');  // all | paid | trial | expired
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['super-clients'],
    queryFn:  () => superApi.get('/super-admin/clients').then(r => r.data),
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['super-clients'] });
    // Re-select with fresh data
    const fresh = await superApi.get('/super-admin/clients').then(r => r.data);
    if (selected) {
      const updated = (fresh.clients || []).find(c => c.id === selected.id);
      if (updated) setSelected(updated);
    }
  };

  const clients = useMemo(() => {
    let all = data?.clients || [];
    if (filter !== 'all') all = all.filter(c => c.account_type === filter);
    if (search) {
      const q = search.toLowerCase();
      all = all.filter(c => (c.company_name || '').toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    }
    return all;
  }, [data, search, filter]);

  const counts = useMemo(() => {
    const all = data?.clients || [];
    return {
      all:     all.length,
      paid:    all.filter(c => c.account_type === 'paid').length,
      trial:   all.filter(c => c.account_type === 'trial').length,
      expired: all.filter(c => c.account_type === 'expired').length,
    };
  }, [data]);

  const FILTERS = [
    { key: 'all',     label: `All (${counts.all})` },
    { key: 'paid',    label: `✅ Paid (${counts.paid})` },
    { key: 'trial',   label: `🕐 Trial (${counts.trial})` },
    { key: 'expired', label: `❌ Expired (${counts.expired})` },
  ];

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      {/* ── Left: client list ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', borderRight: '1px solid #F1F5F9' }}>

        {/* Toolbar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 900, color: '#0F172A' }}>All Clients</h1>
              <p style={{ fontSize: 12, color: '#94A3B8' }}>{clients.length} shown</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{
                  padding: '5px 12px', borderRadius: 20, border: '1.5px solid',
                  borderColor: filter === f.key ? '#1A7A4A' : '#E2E8F0',
                  background:  filter === f.key ? '#F0FDF4' : '#fff',
                  color:       filter === f.key ? '#1A7A4A' : '#64748B',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by company or email…"
              style={{
                width: '100%', padding: '8px 12px 8px 32px', borderRadius: 10,
                border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none',
                background: '#F8FAFC', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Loading clients…</div>
          ) : clients.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No clients found</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ background: '#F8FAFC', position: 'sticky', top: 0, zIndex: 5 }}>
                <tr>
                  {['Company', 'Status', 'Sub / Trial', 'Employees', 'Total Paid', 'Registered', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', whiteSpace: 'nowrap', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    style={{
                      borderBottom: '1px solid #F8FAFC',
                      cursor: 'pointer',
                      background: selected?.id === c.id ? '#FFF7ED' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (selected?.id !== c.id) e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { if (selected?.id !== c.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 9, background: '#E85C2F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                          {(c.company_name || c.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, color: '#0F172A', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.company_name || '—'}</p>
                          <p style={{ color: '#94A3B8', fontSize: 10, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px' }}><TypeBadge type={c.account_type} /></td>
                    <td style={{ padding: '11px 14px', color: '#64748B' }}>
                      {c.sub_active
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CreditCard size={11} color="#16a34a" />
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>
                              {Math.max(0, Math.ceil((new Date(c.sub_paid_until) - new Date()) / (1000*60*60*24)))}d left
                            </span>
                          </span>
                        : c.trial_active
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} color="#D97706" />
                            <span style={{ color: '#D97706', fontWeight: 700 }}>{c.trial_days_remaining}d left</span>
                          </span>
                        : <span style={{ color: '#DC2626', fontWeight: 700 }}>Expired</span>
                      }
                    </td>
                    <td style={{ padding: '11px 14px', color: '#374151', fontWeight: 700 }}>{c.employee_count}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: c.total_paid > 0 ? '#16a34a' : '#94A3B8' }}>
                      {c.total_paid > 0 ? INR(c.total_paid) : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#94A3B8' }}>{DATE(c.created_at)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          const newStatus = c.status === 'active' ? 'suspended' : 'active';
                          superApi.put(`/super-admin/clients/${c.id}/status`, { status: newStatus })
                            .then(() => { toast.success(`Client ${newStatus}`); qc.invalidateQueries({ queryKey: ['super-clients'] }); })
                            .catch(() => toast.error('Could not update'));
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                        title={c.status === 'active' ? 'Suspend' : 'Activate'}
                      >
                        {c.status === 'active'
                          ? <ToggleRight size={18} color="#16a34a" />
                          : <ToggleLeft  size={18} color="#94A3B8" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Right: detail panel ── */}
      {selected && (
        <ClientDetail
          client={selected}
          onClose={() => setSelected(null)}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
