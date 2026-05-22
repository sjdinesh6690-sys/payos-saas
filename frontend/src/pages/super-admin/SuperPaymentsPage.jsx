import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, CheckCircle2, Clock, XCircle, IndianRupee, CreditCard, TrendingUp } from 'lucide-react';
import api from '@/lib/api';

const superApi = {
  get: (path) => api.get(path, {
    headers: { Authorization: `Bearer ${localStorage.getItem('payos_super_token')}` }
  })
};

const INR  = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const DATE = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function StatusBadge({ status }) {
  const map = {
    success: { bg: '#DCFCE7', color: '#15803D', icon: CheckCircle2, label: 'Success' },
    pending: { bg: '#FEF3C7', color: '#D97706', icon: Clock,        label: 'Pending' },
    failed:  { bg: '#FEE2E2', color: '#DC2626', icon: XCircle,      label: 'Failed' },
  };
  const s = map[status] || map.pending;
  const Icon = s.icon;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Icon size={10} /> {s.label}
    </span>
  );
}

function TypeBadge({ type }) {
  const map = {
    base_plan: { bg: '#EFF6FF', color: '#2563EB', label: 'Base Plan' },
    topup:     { bg: '#F5F3FF', color: '#7C3AED', label: 'Top-up' },
  };
  const s = map[type] || { bg: '#F1F5F9', color: '#64748B', label: type };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
      {s.label}
    </span>
  );
}

export default function SuperPaymentsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['super-payments'],
    queryFn:  () => superApi.get('/super-admin/payments').then(r => r.data),
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    let list = payments;
    if (filter !== 'all') list = list.filter(p => p.status === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.company_name || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.razorpay_payment_id || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [payments, search, filter]);

  // Summary metrics
  const totalRevenue  = payments.filter(p => p.status === 'success').reduce((s, p) => s + parseFloat(p.total_amount || 0), 0);
  const thisMonth     = payments.filter(p => p.status === 'success' && new Date(p.created_at) >= new Date(new Date().setDate(1))).reduce((s, p) => s + parseFloat(p.total_amount || 0), 0);
  const pendingCount  = payments.filter(p => p.status === 'pending').length;
  const successCount  = payments.filter(p => p.status === 'success').length;

  const FILTERS = [
    { key: 'all',     label: `All (${payments.length})` },
    { key: 'success', label: `✅ Success (${successCount})` },
    { key: 'pending', label: `⏳ Pending (${pendingCount})` },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', marginBottom: 4 }}>Payment History</h1>
        <p style={{ fontSize: 13, color: '#64748B' }}>All Razorpay payments across all clients</p>
      </div>

      {/* Revenue cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Total Revenue', value: INR(totalRevenue), icon: IndianRupee, color: '#16a34a', bg: '#DCFCE7' },
          { label: 'This Month',    value: INR(thisMonth),    icon: TrendingUp,  color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'Successful',    value: successCount,      icon: CheckCircle2,color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Pending',       value: pendingCount,      icon: Clock,       color: '#D97706', bg: '#FEF3C7' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1.5px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', marginBottom: 3 }}>{value}</p>
            <p style={{ fontSize: 12, color: '#64748B' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        {/* Toolbar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{
                  padding: '5px 12px', borderRadius: 20, border: '1.5px solid',
                  borderColor: filter === f.key ? '#1A7A4A' : '#E2E8F0',
                  background:  filter === f.key ? '#F0FDF4' : '#fff',
                  color:       filter === f.key ? '#1A7A4A' : '#64748B',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search company, email, payment ID…"
              style={{
                padding: '7px 12px 7px 30px', borderRadius: 10,
                border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none',
                background: '#F8FAFC', width: 260, boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Loading payments…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No payments found</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#F8FAFC' }}>
                <tr>
                  {['Client', 'Type', 'Slots', 'Amount', 'GST', 'Total', 'Status', 'Payment ID', 'Date'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', whiteSpace: 'nowrap', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F8FAFC' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 14px' }}>
                      <p style={{ fontWeight: 700, color: '#0F172A', fontSize: 13 }}>{p.company_name || '—'}</p>
                      <p style={{ color: '#94A3B8', fontSize: 11 }}>{p.email}</p>
                    </td>
                    <td style={{ padding: '11px 14px' }}><TypeBadge type={p.payment_type} /></td>
                    <td style={{ padding: '11px 14px', color: '#374151', fontWeight: 600 }}>{p.employee_slots}</td>
                    <td style={{ padding: '11px 14px', color: '#374151' }}>{INR(p.base_amount)}</td>
                    <td style={{ padding: '11px 14px', color: '#94A3B8' }}>{INR(p.gst_amount)}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 800, color: '#0F172A' }}>{INR(p.total_amount)}</td>
                    <td style={{ padding: '11px 14px' }}><StatusBadge status={p.status} /></td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>
                        {p.razorpay_payment_id || p.notes || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#94A3B8', fontSize: 11, whiteSpace: 'nowrap' }}>{DATE(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
