/**
 * PaymentSuccessPage — shown after successful Razorpay payment
 * URL: /admin/payment/success?order=...&invoice=...
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Download, ArrowRight, Receipt, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

const INR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

export default function PaymentSuccessPage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const orderId    = params.get('order')   || '';
  const invoiceNum = params.get('invoice') || '';

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(!!orderId);

  useEffect(() => {
    if (!orderId) return;
    api.get(`/payment/status/${orderId}`)
      .then(r => setInvoice(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  const downloadInvoice = async () => {
    if (!orderId) return;
    try {
      const res = await api.get(`/payment/invoice/${orderId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `${invoiceNum || 'invoice'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download invoice. Try from Billing page.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 40%, #F8FAFC 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* ── Success card ── */}
      <div style={{
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
        padding: '48px 40px',
        maxWidth: 520,
        width: '100%',
        textAlign: 'center',
      }}>
        {/* Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #22C55E, #16A34A)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 4px 20px rgba(34,197,94,0.30)',
        }}>
          <CheckCircle2 size={40} color="#fff" strokeWidth={2.5} />
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
          Payment Successful!
        </h1>
        <p style={{ fontSize: 15, color: '#64748B', marginBottom: 32 }}>
          Your PayLeef Pro subscription is now active.
          {invoiceNum && (
            <> Invoice <strong style={{ color: '#0F172A' }}>{invoiceNum}</strong> has been sent to your email.</>
          )}
        </p>

        {/* Order details */}
        {loading ? (
          <div style={{ padding: '24px 0', color: '#94A3B8', fontSize: 14 }}>Loading order details…</div>
        ) : invoice ? (
          <div style={{
            background: '#F8FAFC',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            padding: '20px 24px',
            marginBottom: 32,
            textAlign: 'left',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Order Summary
            </p>
            <Row label="Plan"        value="PayLeef Pro — Monthly" />
            {invoice.invoice_number && <Row label="Invoice No."  value={invoice.invoice_number} />}
            {invoice.base_amount    && <Row label="Base Amount"  value={INR(invoice.base_amount)} />}
            {invoice.cgst_amount > 0 && <>
              <Row label="CGST (9%)" value={INR(invoice.cgst_amount)} />
              <Row label="SGST (9%)" value={INR(invoice.sgst_amount)} />
            </>}
            {invoice.igst_amount > 0 && (
              <Row label="IGST (18%)" value={INR(invoice.igst_amount)} />
            )}
            {invoice.total_amount && (
              <Row label="Total Paid" value={INR(invoice.total_amount)} bold />
            )}
            {invoice.subscription_end && (
              <Row label="Valid Until" value={new Date(invoice.subscription_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
            )}
          </div>
        ) : null}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orderId && (
            <button
              onClick={downloadInvoice}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: '#F1F5F9', color: '#0F172A',
                border: '1.5px solid #E2E8F0', borderRadius: 10,
                padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Download size={16} />
              Download Invoice (PDF)
            </button>
          )}

          <button
            onClick={() => navigate('/admin/billing')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#F1F5F9', color: '#0F172A',
              border: '1.5px solid #E2E8F0', borderRadius: 10,
              padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Receipt size={16} />
            View Billing & Invoices
          </button>

          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'linear-gradient(135deg, #1B4F8A, #2563EB)',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '13px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(27,79,138,0.25)',
            }}
          >
            <LayoutDashboard size={16} />
            Go to Dashboard
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Footer note */}
      <p style={{ marginTop: 24, fontSize: 13, color: '#94A3B8' }}>
        Need help? Email us at{' '}
        <a href="mailto:support@payleef.com" style={{ color: '#1B4F8A' }}>support@payleef.com</a>
      </p>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0',
      borderTop: '1px solid #F1F5F9',
    }}>
      <span style={{ fontSize: 13, color: '#64748B' }}>{label}</span>
      <span style={{ fontSize: 13, color: bold ? '#0F172A' : '#334155', fontWeight: bold ? 700 : 500 }}>
        {value}
      </span>
    </div>
  );
}
