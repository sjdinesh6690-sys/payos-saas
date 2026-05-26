import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, Clock, AlertTriangle, RefreshCw,
  Receipt, Users, Plus, Minus, CreditCard, Shield, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

const INR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

const GST_RATE          = 0.18;
const BASE_PRICE        = 999;
const PRICE_PER_EMP     = 75;
const BASE_SLOTS        = 5;
// Yearly: pay 10 months, get 12
const BASE_PRICE_YEARLY = 9990;
const PRICE_PER_EMP_YR  = 750;

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
  const navigate = useNavigate();
  const [status,    setStatus]    = useState(null);
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [extraEmps, setExtraEmps] = useState(0);    // extra employees beyond base 5
  const [paying,    setPaying]    = useState(false);
  const [billing,   setBilling]   = useState('monthly'); // 'monthly' | 'yearly'

  const loadData = useCallback(async () => {
    try {
      const [sRes, hRes] = await Promise.all([
        api.get('/billing/status'),
        api.get('/billing/history'),
      ]);
      setStatus(sRes.data);
      setHistory(hRes.data);
    } catch {
      toast.error('Could not load billing info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Price calculation ──────────────────────────────────────────────────────
  const isYearly  = billing === 'yearly';
  const baseAmt   = isYearly ? BASE_PRICE_YEARLY : BASE_PRICE;
  const extraAmt  = extraEmps * (isYearly ? PRICE_PER_EMP_YR : PRICE_PER_EMP);
  const subtotal  = baseAmt + extraAmt;
  const gstAmt    = Math.round(subtotal * GST_RATE);
  const total     = subtotal + gstAmt;
  const totalSlots = BASE_SLOTS + extraEmps;
  const orderType  = isYearly ? 'yearly_plan' : 'base_plan';
  // Yearly savings vs paying monthly for 12 months
  const yearlySavings = Math.round(((BASE_PRICE + extraEmps * PRICE_PER_EMP) * 12 * (1 + GST_RATE)) - total);

  // ── Razorpay flow ──────────────────────────────────────────────────────────
  async function handlePay() {
    setPaying(true);
    try {
      const { data: orderData } = await api.post('/billing/create-order', {
        type:  orderType,
        slots: totalSlots,
      });

      if (orderData.mock) {
        toast.info('Test mode — activating subscription without real payment.');
        await api.post('/billing/verify-payment', {
          mock: true,
          razorpay_order_id: orderData.order_id,
          type: orderType,
          slots: totalSlots,
        });
        const label = isYearly ? '12 months' : '1 month';
        toast.success(`✅ Plan activated! ${totalSlots} employee slots unlocked for ${label}.`);
        await loadData();
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error('Could not load Razorpay. Check your internet.'); return; }

      await new Promise((resolve, reject) => {
        const rz = new window.Razorpay({
          key:         orderData.key,
          amount:      orderData.amount,
          currency:    'INR',
          name:        'PayLeef',
          description: orderData.description,
          order_id:    orderData.order_id,
          theme:       { color: '#1A7A4A' },
          handler: async (resp) => {
            try {
              await api.post('/billing/verify-payment', {
                razorpay_order_id:   resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature:  resp.razorpay_signature,
                type: orderType,
                slots: totalSlots,
              });
              toast.success(`🎉 Payment successful! ${totalSlots} slots activated.`);
              await loadData();
              resolve();
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => { toast.info('Payment cancelled'); resolve(); } },
        });
        rz.open();
      });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Payment failed. Try again.');
    } finally {
      setPaying(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin text-green-600" />
      <span className="ml-3 text-slate-500">Loading…</span>
    </div>
  );

  const isActive      = status?.sub_active;
  const isTrial       = status?.is_free_trial;        // true ONLY when on free trial (not paid)
  const isExpired     = !isActive && !isTrial;
  const empCount      = status?.employee_count || 0;
  const daysLeft      = status?.days_left || 0;       // unified: sub days or trial days
  const planExpiry    = status?.paid_until;
  const trialStarted  = status?.trial_started_on;
  const trialEnds     = status?.trial_ends_on;

  return (
    <div className="p-6 max-w-2xl space-y-6">

      {/* ── Page title ──────────────────────────────────────────────────────── */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
          Billing & Plan
        </h1>
        <p style={{ fontSize: 14, color: '#64748B' }}>
          One simple plan. Pay monthly. Add employees anytime.
        </p>
      </div>

      {/* ── Current status banner ────────────────────────────────────────────── */}
      <div style={{
        borderRadius: 16,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        background: isActive ? '#F0FFF4' : isTrial ? '#FFFBEB' : '#FEF2F2',
        border:     `1.5px solid ${isActive ? '#16a34a' : isTrial ? '#d97706' : '#dc2626'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: isActive ? '#dcfce7' : isTrial ? '#fef3c7' : '#fee2e2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isActive  ? <CheckCircle   size={20} color="#16a34a" /> :
             isTrial   ? <Clock         size={20} color="#d97706" /> :
                         <AlertTriangle size={20} color="#dc2626" />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: isActive ? '#15803d' : isTrial ? '#92400e' : '#991b1b' }}>
              {isActive
                ? '✅ PayLeef Pro — Active'
                : isTrial
                ? `🕐 Free Trial — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`
                : '❌ Trial Ended — Action Required'}
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 3, lineHeight: 1.6 }}>
              {isActive && `Subscription valid until ${fmtDate(planExpiry)} · ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left · ${empCount} employee${empCount !== 1 ? 's' : ''}`}
              {isTrial  && `Free trial runs for 30 days from account creation · expires ${fmtDate(trialEnds)} · No restrictions during trial`}
              {isExpired && 'Your free trial has ended. Purchase the plan below to continue generating payslips.'}
            </div>
          </div>
        </div>
        <button
          onClick={loadData}
          style={{ fontSize: 12, color: '#64748B', background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {/* ── Main pricing card ────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '2px solid #E2E8F0', borderRadius: 20, overflow: 'hidden' }}>

        {/* Billing toggle */}
        <div style={{ padding: '16px 24px 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', background: '#F1F5F9', borderRadius: 12, padding: 4, gap: 2 }}>
            {[
              { key: 'monthly', label: 'Monthly', badge: '' },
              { key: 'yearly',  label: 'Yearly',  badge: '2 months FREE' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setBilling(opt.key)}
                style={{
                  padding: '7px 18px',
                  borderRadius: 9,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  transition: 'all 0.15s',
                  background: billing === opt.key ? '#fff' : 'transparent',
                  color:      billing === opt.key ? '#0F172A' : '#64748B',
                  boxShadow:  billing === opt.key ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {opt.label}
                {opt.badge && (
                  <span style={{ fontSize: 10, fontWeight: 800, background: '#16a34a', color: '#fff', padding: '1px 7px', borderRadius: 20 }}>
                    {opt.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Card header */}
        <div style={{ background: 'linear-gradient(135deg, #1A7A4A 0%, #16a34a 100%)', padding: '20px 24px', margin: '12px 0 0', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                PayLeef Pro — {isYearly ? 'Annual Plan' : 'Monthly Plan'}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 34, fontWeight: 900 }}>{INR(isYearly ? 9990 : 999)}</span>
                <span style={{ fontSize: 13, opacity: 0.8 }}>/{isYearly ? 'year' : 'month'}</span>
              </div>
              {isYearly ? (
                <p style={{ fontSize: 12, opacity: 0.9, marginTop: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '4px 10px', display: 'inline-block' }}>
                  🎉 Save {INR(yearlySavings)} vs monthly — 2 months free!
                </p>
              ) : (
                <p style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                  Includes 5 employees · Add more for ₹75/emp · Switch to yearly to save 17%
                </p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['Unlimited payslip generation', 'PDF & Excel reports', 'Email delivery', 'Attendance tracking'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, opacity: 0.9 }}>
                  <CheckCircle size={12} />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Extra employees selector */}
        <div style={{ padding: '20px 24px', borderBottom: '1.5px solid #F1F5F9' }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 4 }}>
            How many employees do you have?
          </p>
          <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14 }}>
            Base plan covers 5 employees. Add more below if you need.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {/* Base 5 badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#F0FFF4', borderRadius: 12, border: '1.5px solid #bbf7d0' }}>
              <Users size={16} color="#16a34a" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>5 included in plan</span>
            </div>

            {/* Plus */}
            <span style={{ fontSize: 20, color: '#94A3B8', fontWeight: 300 }}>+</span>

            {/* Extra employee stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '2px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
              <button
                onClick={() => setExtraEmps(e => Math.max(0, e - 1))}
                style={{ width: 40, height: 44, background: '#F8FAFC', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 18 }}
              >
                <Minus size={16} />
              </button>
              <div style={{ width: 60, textAlign: 'center', fontWeight: 800, fontSize: 18, color: '#0F172A', borderLeft: '1.5px solid #E2E8F0', borderRight: '1.5px solid #E2E8F0', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {extraEmps}
              </div>
              <button
                onClick={() => setExtraEmps(e => e + 1)}
                style={{ width: 40, height: 44, background: '#F8FAFC', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1A7A4A', fontSize: 18 }}
              >
                <Plus size={16} />
              </button>
            </div>

            <span style={{ fontSize: 13, color: '#64748B' }}>
              extra employees @ ₹75 each
            </span>
          </div>

          {/* Total employee count summary */}
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, fontSize: 13, color: '#374151' }}>
            📋 You will get payslips for <strong>{totalSlots} employee{totalSlots !== 1 ? 's' : ''}</strong> per month
            {empCount > 0 && empCount > totalSlots && (
              <span style={{ color: '#d97706', marginLeft: 8 }}>⚠ You have {empCount} employees — add {empCount - totalSlots} more slot{empCount - totalSlots > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {/* Price breakdown — like a bill */}
        <div style={{ padding: '20px 24px', borderBottom: '1.5px solid #F1F5F9' }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#64748B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Payment Summary
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#374151' }}>
              <span>Base plan (5 employees · {isYearly ? '12 months' : '1 month'})</span>
              <span style={{ fontWeight: 600 }}>{INR(baseAmt)}</span>
            </div>

            {extraEmps > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#374151' }}>
                <span>Extra employees ({extraEmps} × ₹{isYearly ? PRICE_PER_EMP_YR : PRICE_PER_EMP})</span>
                <span style={{ fontWeight: 600 }}>{INR(extraAmt)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#94A3B8' }}>
              <span>GST (18%)</span>
              <span>{INR(gstAmt)}</span>
            </div>

            {isYearly && yearlySavings > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#16a34a', background: '#F0FFF4', borderRadius: 8, padding: '6px 10px' }}>
                <span>🎉 You save vs monthly</span>
                <span style={{ fontWeight: 700 }}>{INR(yearlySavings)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800, color: '#0F172A', borderTop: '2px solid #F1F5F9', paddingTop: 10, marginTop: 2 }}>
              <span>Total {isYearly ? 'per year' : 'per month'}</span>
              <span style={{ color: '#1A7A4A' }}>{INR(total)}</span>
            </div>
          </div>
        </div>

        {/* Pay button */}
        <div style={{ padding: '20px 24px' }}>
          <button
            onClick={() => navigate('/admin/payment/checkout')}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: 'linear-gradient(135deg, #1A7A4A, #16a34a)',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: '0 4px 14px rgba(26,122,74,0.30)',
              transition: 'opacity 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            <CreditCard size={18} />
            {isActive ? 'Renew Plan' : isTrial ? 'Upgrade to Pro' : 'Activate Plan'} — {INR(total)}{isYearly ? '/year' : '/month'}
            <ArrowRight size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94A3B8' }}>
              <Shield size={12} /> Secure via Razorpay
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94A3B8' }}>
              <Receipt size={12} /> GST invoice included
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94A3B8' }}>
              <CheckCircle size={12} /> Instant activation
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment History ──────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
            Payment History
          </h2>
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px solid #E2E8F0' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Date', 'Plan', 'Employees', 'Amount', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1.5px solid #E2E8F0' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: i < history.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                    <td style={{ padding: '12px 14px', color: '#64748B' }}>{fmtDate(p.created_at)}</td>
                    <td style={{ padding: '12px 14px', color: '#0F172A', fontWeight: 600 }}>
                      PayLeef Pro {p.payment_type === 'yearly_plan' ? '(Annual)' : '(Monthly)'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{ background: '#F0FFF4', color: '#15803d', padding: '2px 10px', borderRadius: 20, fontWeight: 700, fontSize: 12 }}>
                        {p.employee_slots} emp
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>{INR(p.total_amount)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontWeight: 600, fontSize: 12,
                        background: p.status === 'success' ? '#dcfce7' : p.status === 'pending' ? '#fef3c7' : '#fee2e2',
                        color:      p.status === 'success' ? '#15803d' : p.status === 'pending' ? '#92400e' : '#991b1b',
                      }}>
                        {p.status === 'success' ? '✓ Paid' : p.status === 'pending' ? 'Pending' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
        All prices in INR · 18% GST included · For billing support contact support@payleef.com
      </p>
    </div>
  );
}
