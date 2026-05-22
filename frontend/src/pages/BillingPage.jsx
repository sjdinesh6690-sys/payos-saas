import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Users, CheckCircle, AlertTriangle, Clock,
  RefreshCw, Receipt, ChevronRight, Zap, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

const INR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

const GST_RATE = 0.18;

// Load Razorpay checkout script dynamically
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function BillingPage() {
  const [status, setStatus]       = useState(null);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [topupSlots, setTopupSlots] = useState(10);
  const [purchasing, setPurchasing] = useState(null); // 'base_plan' | 'topup' | null

  const loadData = useCallback(async () => {
    try {
      const [sRes, hRes] = await Promise.all([
        api.get('/billing/status'),
        api.get('/billing/history'),
      ]);
      setStatus(sRes.data);
      setHistory(hRes.data);
    } catch (err) {
      toast.error('Could not load billing info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Razorpay checkout flow ─────────────────────────────────────────────────
  async function handlePurchase(type) {
    setPurchasing(type);
    try {
      const slots = type === 'topup' ? topupSlots : 5;

      // 1. Create order on backend
      const { data: orderData } = await api.post('/billing/create-order', { type, slots });

      // Mock payment flow (no Razorpay keys yet)
      if (orderData.mock) {
        toast.info('Razorpay keys not configured yet — activating mock payment for testing.');
        const { data: vRes } = await api.post('/billing/verify-payment', {
          mock: true,
          razorpay_order_id: orderData.order_id,
          type,
          slots,
        });
        if (vRes.success) {
          toast.success(type === 'base_plan'
            ? '✅ Plan activated (mock)! You now have 5 employee slots.'
            : `✅ ${slots} slots added (mock)!`
          );
          await loadData();
        }
        return;
      }

      // 2. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Could not load Razorpay checkout. Check your internet connection.');
        return;
      }

      // 3. Open Razorpay modal
      const adminEmail = localStorage.getItem('employee_name') || '';
      await new Promise((resolve, reject) => {
        const options = {
          key:         orderData.key,
          amount:      orderData.amount,
          currency:    'INR',
          name:        'PayLeef',
          description: orderData.description,
          image:       '/logo.png',
          order_id:    orderData.order_id,
          prefill:     { email: adminEmail },
          theme:       { color: '#1A7A4A' },
          handler: async (response) => {
            try {
              const { data: vRes } = await api.post('/billing/verify-payment', {
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                type,
                slots,
              });
              if (vRes.success) {
                toast.success(type === 'base_plan'
                  ? '🎉 Plan activated! You can now generate payslips.'
                  : `✅ ${slots} employee slots added successfully!`
                );
                await loadData();
              }
              resolve();
            } catch (err) {
              toast.error('Payment verification failed. Contact support.');
              reject(err);
            }
          },
          modal: {
            ondismiss: () => {
              toast.info('Payment cancelled');
              resolve();
            }
          }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setPurchasing(null);
    }
  }

  // ── Computed values ────────────────────────────────────────────────────────
  const topupBase  = topupSlots * (status?.topup_price_per_slot || 75);
  const topupGst   = Math.round(topupBase * GST_RATE * 100) / 100;
  const topupTotal = topupBase + topupGst;

  const baseGst   = Math.round((status?.base_plan_price || 999) * GST_RATE * 100) / 100;
  const baseTotal = (status?.base_plan_price || 999) + baseGst;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin text-green-600" />
        <span className="ml-3 text-slate-500">Loading billing info…</span>
      </div>
    );
  }

  // ── Status banner ──────────────────────────────────────────────────────────
  const planColor = status?.sub_active
    ? { bg: '#F0FFF4', border: '#16a34a', text: '#15803d', badge: '#dcfce7', badgeText: '#16a34a' }
    : status?.trial_active
    ? { bg: '#FFFBEB', border: '#d97706', text: '#92400e', badge: '#fef3c7', badgeText: '#d97706' }
    : { bg: '#FEF2F2', border: '#dc2626', text: '#991b1b', badge: '#fee2e2', badgeText: '#dc2626' };

  const slotsUsed   = status?.employee_count || 0;
  const slotsTotal  = status?.employee_limit || 0;
  const slotsPct    = slotsTotal > 0 ? Math.min(100, (slotsUsed / slotsTotal) * 100) : 100;
  const slotsOver   = false; // slot limit not enforced — no blocking

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">

      {/* ── Page header ── */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
          Billing & Plan
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Manage your PayLeef subscription and employee slots
        </p>
      </div>

      {/* ── Current Plan Status ── */}
      <div
        className="rounded-2xl p-6"
        style={{ background: planColor.bg, border: `1.5px solid ${planColor.border}` }}
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: planColor.badge }}
            >
              {status?.sub_active
                ? <CheckCircle size={20} style={{ color: planColor.badgeText }} />
                : status?.trial_active
                ? <Clock size={20} style={{ color: planColor.badgeText }} />
                : <AlertTriangle size={20} style={{ color: planColor.badgeText }} />
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 16, fontWeight: 700, color: planColor.text }}>
                  {status?.plan_label}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: planColor.badge, color: planColor.badgeText }}
                >
                  {status?.sub_active ? 'ACTIVE' : status?.trial_active ? 'TRIAL' : 'EXPIRED'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: planColor.text, marginTop: 2, opacity: 0.8 }}>
                {status?.sub_active || status?.trial_active
                  ? `Valid until ${fmtDate(status.paid_until)}`
                  : 'Your trial has ended. Purchase a plan to continue.'}
                {status?.trial_active && ` — ${status.trial_days_left} days remaining`}
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: planColor.badge, color: planColor.badgeText }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {/* Employee slot usage — only show limits for paid subscribers */}
        <div className="mt-5">
          {/* Employee count — informational only, no blocking */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F0FFF4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
            <CheckCircle size={15} style={{ color: '#16a34a', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>
              {slotsUsed} active employee{slotsUsed !== 1 ? 's' : ''} — payslip generation fully unlocked.
            </span>
          </div>
        </div>
      </div>

      {/* ── Plan Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Base Plan card */}
        <div className="rounded-2xl p-6 flex flex-col" style={{ border: '1.5px solid var(--border-light)', background: 'white' }}>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} style={{ color: '#1A7A4A' }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
              Base Plan
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Monthly subscription · renews each month
          </p>

          <div className="mb-4">
            <div className="flex items-baseline gap-1">
              <span style={{ fontSize: 28, fontWeight: 900, color: '#1A7A4A' }}>{INR(999)}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/month</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              + GST ({INR(baseGst)}) = {INR(baseTotal)} total
            </div>
          </div>

          <ul className="space-y-2 mb-6 flex-1">
            {[
              '5 employee slots (add more for ₹75/slot)',
              'Unlimited payslip generation',
              'Email delivery via Resend',
              'PDF & Excel reports',
              'Attendance & leave tracking',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                <CheckCircle size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => handlePurchase('base_plan')}
            disabled={!!purchasing}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: purchasing === 'base_plan' ? '#a7f3d0' : '#1A7A4A',
              color: 'white',
              cursor: purchasing ? 'not-allowed' : 'pointer',
            }}
          >
            {purchasing === 'base_plan'
              ? <><RefreshCw size={14} className="animate-spin" /> Processing…</>
              : status?.sub_active
              ? <><RefreshCw size={14} /> Renew Plan — {INR(baseTotal)}</>
              : <><CreditCard size={14} /> Purchase Plan — {INR(baseTotal)}</>
            }
          </button>

          <p className="text-center mt-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Includes 18% GST · Secure via Razorpay
          </p>
        </div>

        {/* Top-up card */}
        <div className="rounded-2xl p-6 flex flex-col" style={{ border: '1.5px solid var(--border-light)', background: 'white' }}>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={18} style={{ color: '#7c3aed' }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
              Add Employee Slots
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Top up any time · slots added instantly
          </p>

          <div className="mb-4">
            <div className="flex items-baseline gap-1">
              <span style={{ fontSize: 28, fontWeight: 900, color: '#7c3aed' }}>₹75</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/employee</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              + 18% GST · minimum 10 slots per purchase
            </div>
          </div>

          {/* Slot selector */}
          <div className="mb-4">
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Number of slots to add
            </label>
            <div className="flex items-center gap-2 mt-2">
              {[10, 20, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => setTopupSlots(n)}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: topupSlots === n ? '#7c3aed' : 'var(--border-light)',
                    color: topupSlots === n ? 'white' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {n}
                </button>
              ))}
              <input
                type="number"
                min={10}
                step={1}
                value={topupSlots}
                onChange={(e) => setTopupSlots(Math.max(10, parseInt(e.target.value) || 10))}
                className="w-20 px-3 py-1.5 rounded-lg text-sm text-center font-semibold"
                style={{
                  border: '1.5px solid var(--border-light)',
                  outline: 'none',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Price breakdown */}
          <div
            className="rounded-xl p-4 mb-4 flex-1"
            style={{ background: '#F5F3FF', border: '1px solid #ddd6fe' }}
          >
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span style={{ color: '#5b21b6' }}>{topupSlots} slots × ₹75</span>
                <span style={{ fontWeight: 600, color: '#5b21b6' }}>{INR(topupBase)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#5b21b6' }}>GST (18%)</span>
                <span style={{ fontWeight: 600, color: '#5b21b6' }}>{INR(topupGst)}</span>
              </div>
              <div
                className="flex justify-between pt-2 mt-1"
                style={{ borderTop: '1px solid #ddd6fe' }}
              >
                <span style={{ fontWeight: 700, color: '#4c1d95' }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: '#7c3aed' }}>{INR(topupTotal)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handlePurchase('topup')}
            disabled={!!purchasing || !status?.sub_active}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: !status?.sub_active
                ? '#e2e8f0'
                : purchasing === 'topup' ? '#ddd6fe' : '#7c3aed',
              color: !status?.sub_active ? '#94a3b8' : 'white',
              cursor: (purchasing || !status?.sub_active) ? 'not-allowed' : 'pointer',
            }}
          >
            {purchasing === 'topup'
              ? <><RefreshCw size={14} className="animate-spin" /> Processing…</>
              : !status?.sub_active
              ? 'Purchase Base Plan first'
              : <><Zap size={14} /> Add {topupSlots} Slots — {INR(topupTotal)}</>
            }
          </button>

          <p className="text-center mt-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {status?.sub_active
              ? 'Slots added immediately after payment'
              : 'Requires an active Base Plan'}
          </p>
        </div>
      </div>

      {/* ── What you get info strip ── */}
      <div
        className="rounded-xl p-4 flex flex-wrap gap-6"
        style={{ background: 'var(--border-light)', border: '1px solid var(--border-light)' }}
      >
        {[
          { icon: Shield,  label: 'Secure Payments', sub: 'Powered by Razorpay' },
          { icon: Receipt, label: 'GST Invoice',      sub: 'Included with every payment' },
          { icon: Zap,     label: 'Instant Activation', sub: 'Slots available immediately' },
          { icon: Users,   label: 'Add Anytime',      sub: 'No annual lock-in' },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex items-center gap-2 flex-1 min-w-[160px]">
            <Icon size={16} style={{ color: '#1A7A4A' }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Payment History ── */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          Payment History
        </h2>

        {history.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: 'var(--border-light)', border: '1px dashed var(--border-light)' }}
          >
            <Receipt size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No payments yet</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-light)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
                  {['Date', 'Type', 'Slots', 'Amount', 'GST', 'Total', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: i < history.length - 1 ? '1px solid var(--border-light)' : 'none',
                      background: i % 2 === 0 ? 'white' : '#FAFAFA',
                    }}
                  >
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {fmtDate(p.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: p.payment_type === 'base_plan' ? '#dcfce7' : '#ede9fe',
                          color:      p.payment_type === 'base_plan' ? '#15803d' : '#6d28d9',
                        }}
                      >
                        {p.payment_type === 'base_plan' ? 'Base Plan' : 'Top-up'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                      +{p.employee_slots}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {INR(p.base_amount)}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {INR(p.gst_amount)}
                    </td>
                    <td className="px-4 py-3" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {INR(p.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: p.status === 'success' ? '#dcfce7' : p.status === 'pending' ? '#fef3c7' : '#fee2e2',
                          color:      p.status === 'success' ? '#15803d' : p.status === 'pending' ? '#92400e' : '#991b1b',
                        }}
                      >
                        {p.status === 'success' ? '✓ Paid' : p.status === 'pending' ? 'Pending' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GST note */}
      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
        All prices are in Indian Rupees (INR). GST @ 18% is charged on all transactions.
        For GST invoices and support, contact support@payleef.com
      </p>
    </div>
  );
}
