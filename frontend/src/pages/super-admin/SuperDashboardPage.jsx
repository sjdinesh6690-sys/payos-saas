import { useQuery } from '@tanstack/react-query';
import {
  Users, FileText, TrendingUp, Building2, CheckCircle2, AlertCircle,
  IndianRupee, CreditCard, Clock, ArrowUp, ArrowDown, AlertTriangle, Zap,
} from 'lucide-react';
import api from '@/lib/api';

const superApi = {
  get: (path) => api.get(path, {
    headers: { Authorization: `Bearer ${localStorage.getItem('payos_super_token')}` }
  })
};

const INR  = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const NUM  = (n) => new Intl.NumberFormat('en-IN').format(n || 0);
const DATE = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// Mini stat card
function StatCard({ label, value, icon: Icon, color, bg, sub, trend }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: '1.5px solid #F1F5F9', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend !== undefined && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 2,
            fontSize: 11, fontWeight: 700, padding: '3px 7px', borderRadius: 20,
            background: trend >= 0 ? '#DCFCE7' : '#FEF2F2',
            color: trend >= 0 ? '#16a34a' : '#DC2626',
          }}>
            {trend >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', marginBottom: 3 }}>{value}</p>
      <p style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

// Client type pill
function TypeBadge({ type }) {
  const map = {
    paid:    { bg: '#DCFCE7', color: '#15803D', label: 'Paid' },
    trial:   { bg: '#FFF7ED', color: '#C2410C', label: 'Trial' },
    expired: { bg: '#FEF2F2', color: '#DC2626', label: 'Expired' },
  };
  const s = map[type] || map.trial;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
      {s.label}
    </span>
  );
}

export default function SuperDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['super-stats'],
    queryFn: () => superApi.get('/super-admin/stats').then(r => r.data),
    refetchInterval: 60_000,
  });

  const { data: clientsData } = useQuery({
    queryKey: ['super-clients'],
    queryFn: () => superApi.get('/super-admin/clients').then(r => r.data),
  });

  const clients = clientsData?.clients || [];
  const recentSignups = [...clients].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);

  const revGrowth = stats?.revenue_last_month > 0
    ? Math.round(((stats.revenue_this_month - stats.revenue_last_month) / stats.revenue_last_month) * 100)
    : null;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ fontSize: 14, color: '#94A3B8' }}>Loading platform data…</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', marginBottom: 4 }}>Platform Overview</h1>
        <p style={{ fontSize: 13, color: '#64748B' }}>Live metrics across all PayLeef client companies</p>
      </div>

      {/* Revenue row */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          💰 Revenue
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <StatCard label="Total Revenue Collected" value={INR(stats?.total_revenue)} icon={IndianRupee} color="#16a34a" bg="#DCFCE7"
            sub={`${NUM(stats?.successful_payments)} successful payments`} />
          <StatCard label="Revenue This Month" value={INR(stats?.revenue_this_month)} icon={TrendingUp} color="#7C3AED" bg="#F5F3FF"
            trend={revGrowth} sub={`Last month: ${INR(stats?.revenue_last_month)}`} />
          <StatCard label="Paying Clients" value={NUM(stats?.paid_clients)} icon={CreditCard} color="#2563EB" bg="#EFF6FF"
            sub="Active subscriptions" />
          <StatCard label="Trial Clients" value={NUM(stats?.trial_clients)} icon={Clock} color="#D97706" bg="#FFFBEB"
            sub={`${NUM(stats?.expired_clients)} expired`} />
        </div>
      </div>

      {/* Platform stats row */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          📊 Platform Activity
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <StatCard label="Total Clients" value={NUM(stats?.total_clients)} icon={Building2} color="#0891B2" bg="#ECFEFF" />
          <StatCard label="Active Employees" value={NUM(stats?.total_employees)} icon={Users} color="#7C3AED" bg="#F5F3FF" />
          <StatCard label="Payslips Generated" value={NUM(stats?.total_payslips)} icon={FileText} color="#E85C2F" bg="#FFF4F0"
            sub={`${NUM(stats?.payslips_this_month)} this month`} />
          <StatCard label="Salary Disbursed" value={INR(stats?.total_disbursed)} icon={IndianRupee} color="#059669" bg="#ECFDF5" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Client breakdown */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Client Status Breakdown</h2>
          </div>
          <div style={{ padding: '20px' }}>
            {[
              { label: 'Paid Subscribers', count: stats?.paid_clients || 0, color: '#16a34a', bg: '#DCFCE7', icon: CheckCircle2 },
              { label: 'On Free Trial',    count: stats?.trial_clients || 0, color: '#D97706', bg: '#FEF3C7', icon: Clock },
              { label: 'Trial Expired',    count: stats?.expired_clients || 0, color: '#DC2626', bg: '#FEE2E2', icon: AlertCircle },
              { label: 'Suspended',        count: stats?.suspended_clients || 0, color: '#64748B', bg: '#F1F5F9', icon: AlertTriangle },
            ].map(({ label, count, color, bg, icon: Icon }) => {
              const total = stats?.total_clients || 1;
              const pct   = Math.round((count / total) * 100);
              return (
                <div key={label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={14} style={{ color }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: '#F1F5F9', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 6, transition: 'width 0.4s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expiring subscriptions alert */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', background: stats?.expiring_soon?.length > 0 ? '#FFFBEB' : '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {stats?.expiring_soon?.length > 0
                ? <AlertTriangle size={15} color="#D97706" />
                : <CheckCircle2 size={15} color="#16a34a" />}
              <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                Subscriptions Expiring (7 days)
              </h2>
              {stats?.expiring_soon?.length > 0 && (
                <span style={{ background: '#FEF3C7', color: '#D97706', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                  {stats.expiring_soon.length} clients
                </span>
              )}
            </div>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {!stats?.expiring_soon?.length ? (
              <div style={{ padding: 30, textAlign: 'center' }}>
                <CheckCircle2 size={32} color="#86EFAC" style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 13, color: '#64748B' }}>No subscriptions expiring soon 🎉</p>
              </div>
            ) : (
              stats.expiring_soon.map((c, i) => {
                const daysLeft = Math.max(0, Math.ceil((new Date(c.paid_until) - new Date()) / (1000*60*60*24)));
                return (
                  <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{c.company_name || c.email}</p>
                      <p style={{ fontSize: 11, color: '#94A3B8' }}>Expires {DATE(c.paid_until)}</p>
                    </div>
                    <span style={{
                      background: daysLeft <= 2 ? '#FEE2E2' : '#FEF3C7',
                      color: daysLeft <= 2 ? '#DC2626' : '#D97706',
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                    }}>
                      {daysLeft}d left
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent signups */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Recent Signups</h2>
          <a href="/super-admin/clients" style={{ fontSize: 12, fontWeight: 700, color: '#E85C2F', textDecoration: 'none' }}>View all →</a>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Company', 'Email', 'Type', 'Employees', 'Total Paid', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentSignups.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#E85C2F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                        {(c.company_name || c.email || '?')[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 700, color: '#0F172A', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.company_name || '—'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748B', maxWidth: 160 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{c.email}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}><TypeBadge type={c.account_type} /></td>
                  <td style={{ padding: '12px 16px', color: '#374151', fontWeight: 600 }}>{c.employee_count}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: c.total_paid > 0 ? '#16a34a' : '#94A3B8' }}>
                    {c.total_paid > 0 ? INR(c.total_paid) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: 12 }}>{DATE(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
