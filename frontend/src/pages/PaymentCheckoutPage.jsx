/**
 * PaymentCheckoutPage — Multi-step PayLeef subscription checkout
 * Steps: 1. Customer Info → 2. GST Details → 3. Review & Pay
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Building2, Phone, Mail, FileText, MapPin,
  ChevronRight, ChevronLeft, CheckCircle, Shield,
  CreditCard, Loader2, Search, AlertCircle, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

// ── Constants ─────────────────────────────────────────────────────────────────
const BASE_PRICE  = 999;
const BASE_SLOTS  = 5;
const PLAN_NAME   = 'PayLeef Pro';
const PLAN_MONTHS = 1;
const INR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

// ── Razorpay script loader ────────────────────────────────────────────────────
function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src    = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepBar({ current }) {
  const steps = ['Your Details', 'GST Info', 'Review & Pay'];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, i) => {
        const idx   = i + 1;
        const done  = idx < current;
        const active = idx === current;
        return (
          <div key={idx} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all
              ${done   ? 'bg-green-500 text-white'
              : active ? 'bg-[#1A7A4A] text-white ring-4 ring-green-100'
              :           'bg-slate-200 text-slate-500'}`}>
              {done ? <CheckCircle size={16} /> : idx}
            </div>
            <span className={`text-sm font-medium hidden sm:block
              ${active ? 'text-slate-800' : done ? 'text-green-600' : 'text-slate-400'}`}>
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 ${done ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Input component ───────────────────────────────────────────────────────────
function Field({ label, required, error, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint  && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={12}/>{error}</p>}
    </div>
  );
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800
        placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
        disabled:bg-slate-50 disabled:text-slate-500
        ${props['aria-invalid'] ? 'border-red-400 bg-red-50' : 'border-slate-300'}
        ${className}`}
      {...props}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PaymentCheckoutPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1: Customer info
  const [form, setForm] = useState({
    full_name:      '',
    company_name:   '',
    mobile:         '',
    email:          '',
    accounts_email: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Step 2: GST info
  const [hasGst,        setHasGst]        = useState(false);
  const [gstNumber,     setGstNumber]      = useState('');
  const [gstInfo,       setGstInfo]        = useState(null);  // from API
  const [gstLoading,    setGstLoading]     = useState(false);
  const [gstError,      setGstError]       = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingState,   setBillingState]   = useState('');

  // Payment state
  const [paying,    setPaying]    = useState(false);
  const [orderData, setOrderData] = useState(null);  // preview amounts
  const rzpRef = useRef(null);

  // Load preview amounts on Step 3
  useEffect(() => {
    if (step === 3) {
      const stateCode = gstInfo?.state_code || null;
      // Calculate locally to show preview (no API call needed)
      const base  = BASE_PRICE * PLAN_MONTHS;
      const gst   = Math.round(base * 0.18 * 100) / 100;
      const half  = Math.round((gst / 2) * 100) / 100;
      const isTN  = stateCode === '33';
      setOrderData({
        base_amount:  base,
        gst_amount:   gst,
        cgst_amount:  isTN ? half : 0,
        sgst_amount:  isTN ? (gst - half) : 0,
        igst_amount:  isTN ? 0 : gst,
        total_amount: Math.round((base + gst) * 100) / 100,
        tax_type:     stateCode ? (isTN ? 'CGST + SGST' : 'IGST') : 'GST',
        is_same_state: isTN,
      });
    }
  }, [step, gstInfo]);

  // ── Field helpers ─────────────────────────────────────────────────────────
  const set = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value }));
    setFormErrors(p => ({ ...p, [field]: '' }));
  };

  // ── Validate Step 1 ───────────────────────────────────────────────────────
  function validateStep1() {
    const errs = {};
    if (!form.full_name.trim())    errs.full_name    = 'Full name is required.';
    if (!form.company_name.trim()) errs.company_name = 'Company name is required.';
    if (!form.email.trim())        errs.email        = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
      errs.email = 'Enter a valid email address.';

    if (!form.mobile.trim())       errs.mobile = 'Mobile number is required.';
    else {
      const m = form.mobile.replace(/[\s\-+() ]/g, '');
      const m10 = m.startsWith('91') && m.length === 12 ? m.slice(2) : m;
      if (!/^[6-9]\d{9}$/.test(m10))
        errs.mobile = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (form.accounts_email && !/^\S+@\S+\.\S+$/.test(form.accounts_email.trim()))
      errs.accounts_email = 'Enter a valid accounts email.';

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Validate Step 2 ───────────────────────────────────────────────────────
  function validateStep2() {
    if (!hasGst) return true;
    if (!gstNumber.trim()) {
      setGstError('GSTIN is required when GST is enabled.');
      return false;
    }
    if (!gstInfo) {
      setGstError('Please verify GSTIN first.');
      return false;
    }
    return true;
  }

  // ── GSTIN lookup ──────────────────────────────────────────────────────────
  async function lookupGST() {
    const clean = gstNumber.trim().toUpperCase();
    if (!clean) { setGstError('Enter a GSTIN to verify.'); return; }
    setGstLoading(true);
    setGstError('');
    setGstInfo(null);
    try {
      const { data } = await api.get(`/payment/gst-lookup/${clean}`);
      setGstInfo(data);
      setGstNumber(data.gstin); // normalised uppercase
      if (!billingState && data.state_name) setBillingState(data.state_name);
      if (data.company_name && !form.company_name.trim()) {
        setForm(p => ({ ...p, company_name: data.company_name }));
      }
      toast.success(`GSTIN verified — ${data.state_name}`);
    } catch (err) {
      setGstError(err.response?.data?.error || 'Invalid GSTIN. Please check and try again.');
    } finally {
      setGstLoading(false);
    }
  }

  // ── Step navigation ───────────────────────────────────────────────────────
  function goNext() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function goBack() {
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Payment flow ──────────────────────────────────────────────────────────
  async function handlePay() {
    setPaying(true);
    try {
      // 1. Load Razorpay script
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error('Could not load payment gateway. Check your internet and try again.');
        setPaying(false);
        return;
      }

      // 2. Create order on backend
      const { data: order } = await api.post('/payment/create-order', {
        full_name:       form.full_name.trim(),
        company_name:    form.company_name.trim(),
        mobile:          form.mobile.trim(),
        email:           form.email.trim().toLowerCase(),
        accounts_email:  form.accounts_email?.trim() || undefined,
        has_gst:         hasGst,
        gst_number:      hasGst ? gstNumber : undefined,
        billing_address: billingAddress || undefined,
        state:           billingState   || gstInfo?.state_name || undefined,
        plan_name:       PLAN_NAME,
        plan_months:     PLAN_MONTHS,
      });

      // 3. Open Razorpay modal
      const options = {
        key:         order.key,
        amount:      order.amount,
        currency:    'INR',
        name:        'PayLeef by Dinmind',
        description: `${order.plan_name} — ${BASE_SLOTS} Employees (${PLAN_MONTHS} Month)`,
        order_id:    order.order_id,
        prefill: {
          name:    form.full_name.trim(),
          email:   form.email.trim(),
          contact: form.mobile.replace(/[\s\-+() ]/g, ''),
        },
        theme: { color: '#1A7A4A' },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled. You can try again anytime.');
            setPaying(false);
          },
        },
        handler: async (response) => {
          try {
            // 4. Verify with backend (HMAC check + activate subscription)
            const { data: verifyResult } = await api.post('/payment/verify', {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            });

            // 5. Navigate to success page
            navigate(`/admin/payment/success?order=${response.razorpay_order_id}&invoice=${verifyResult.invoice_number || ''}`);
          } catch (verifyErr) {
            toast.error('Payment received but verification failed. Please contact support.');
            console.error('Verify error:', verifyErr);
          } finally {
            setPaying(false);
          }
        },
      };

      rzpRef.current = new window.Razorpay(options);
      rzpRef.current.on('payment.failed', (resp) => {
        toast.error(`Payment failed: ${resp.error.description}`);
        setPaying(false);
      });
      rzpRef.current.open();

    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initiate payment. Please try again.');
      setPaying(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-3">
            <Shield size={14} /> Secure Payment
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Subscribe to PayLeef Pro</h1>
          <p className="text-slate-500 text-sm mt-1">₹999/month + GST · 5 Employee slots · Cancel anytime</p>
        </div>

        <StepBar current={step} />

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">

          {/* ── STEP 1: Customer Details ─────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <User size={20} className="text-green-600" /> Your Details
              </h2>
              <p className="text-sm text-slate-500">This information will appear on your tax invoice.</p>

              <Field label="Full Name" required error={formErrors.full_name}>
                <Input
                  placeholder="e.g. Rajesh Kumar"
                  value={form.full_name}
                  onChange={set('full_name')}
                  aria-invalid={!!formErrors.full_name}
                />
              </Field>

              <Field label="Company Name" required error={formErrors.company_name}>
                <Input
                  placeholder="e.g. Acme Solutions Pvt Ltd"
                  value={form.company_name}
                  onChange={set('company_name')}
                  aria-invalid={!!formErrors.company_name}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Mobile Number" required error={formErrors.mobile}
                  hint="10-digit Indian mobile number">
                  <Input
                    placeholder="9876543210"
                    value={form.mobile}
                    onChange={set('mobile')}
                    maxLength={13}
                    aria-invalid={!!formErrors.mobile}
                  />
                </Field>
                <Field label="Email Address" required error={formErrors.email}>
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={set('email')}
                    aria-invalid={!!formErrors.email}
                  />
                </Field>
              </div>

              <Field label="Accounts / Billing Email" error={formErrors.accounts_email}
                hint="Invoice will also be sent here (optional)">
                <Input
                  type="email"
                  placeholder="accounts@company.com"
                  value={form.accounts_email}
                  onChange={set('accounts_email')}
                  aria-invalid={!!formErrors.accounts_email}
                />
              </Field>
            </div>
          )}

          {/* ── STEP 2: GST Details ──────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <FileText size={20} className="text-green-600" /> GST Details
              </h2>

              {/* GST toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-medium text-slate-800">Do you have a GST registration?</p>
                  <p className="text-xs text-slate-500 mt-0.5">Enter GSTIN to get GST input credit on your invoice</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setHasGst(false); setGstInfo(null); setGstError(''); }}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${!hasGst ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>
                    No
                  </button>
                  <button
                    onClick={() => setHasGst(true)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${hasGst ? 'bg-[#1A7A4A] text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>
                    Yes
                  </button>
                </div>
              </div>

              {/* GSTIN input (shown when hasGst = true) */}
              {hasGst && (
                <div className="space-y-4">
                  <Field label="GSTIN" required error={gstError}
                    hint="15-character GST Identification Number">
                    <div className="flex gap-2">
                      <Input
                        placeholder="33XXXXX0000X1ZX"
                        value={gstNumber}
                        onChange={(e) => {
                          setGstNumber(e.target.value.toUpperCase());
                          setGstInfo(null);
                          setGstError('');
                        }}
                        maxLength={15}
                        aria-invalid={!!gstError}
                      />
                      <button
                        onClick={lookupGST}
                        disabled={gstLoading || !gstNumber.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#1A7A4A] text-white text-sm font-medium
                          rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0">
                        {gstLoading
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Search size={14} />}
                        Verify
                      </button>
                    </div>
                  </Field>

                  {/* GST verified info card */}
                  {gstInfo && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                        <CheckCircle size={16} /> GSTIN Verified
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        {gstInfo.company_name && (
                          <>
                            <span className="text-slate-500">Company</span>
                            <span className="text-slate-800 font-medium">{gstInfo.company_name}</span>
                          </>
                        )}
                        <span className="text-slate-500">State</span>
                        <span className="text-slate-800">{gstInfo.state_name}</span>
                        <span className="text-slate-500">Tax Type</span>
                        <span className={`font-medium ${gstInfo.is_same_state ? 'text-blue-600' : 'text-purple-600'}`}>
                          {gstInfo.tax_type}
                        </span>
                      </div>
                      {gstInfo.tax_preview && (
                        <div className="mt-3 pt-3 border-t border-green-200 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <span className="text-slate-500">Base (excl. GST)</span>
                          <span className="text-slate-800">{INR(gstInfo.tax_preview.base_amount)}</span>
                          {gstInfo.is_same_state ? (
                            <>
                              <span className="text-slate-500">CGST @ 9%</span>
                              <span className="text-slate-800">{INR(gstInfo.tax_preview.cgst_amount)}</span>
                              <span className="text-slate-500">SGST @ 9%</span>
                              <span className="text-slate-800">{INR(gstInfo.tax_preview.sgst_amount)}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-slate-500">IGST @ 18%</span>
                              <span className="text-slate-800">{INR(gstInfo.tax_preview.igst_amount)}</span>
                            </>
                          )}
                          <span className="text-slate-700 font-semibold">Total</span>
                          <span className="text-green-700 font-bold">{INR(gstInfo.tax_preview.total_amount)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Optional billing address */}
                  <Field label="Billing Address" hint="Optional — appears on invoice">
                    <textarea
                      rows={2}
                      placeholder="Street, City, Pincode"
                      value={billingAddress}
                      onChange={e => setBillingAddress(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800
                        placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    />
                  </Field>

                  <Field label="State" hint="Optional">
                    <Input
                      placeholder="e.g. Tamil Nadu"
                      value={billingState}
                      onChange={e => setBillingState(e.target.value)}
                    />
                  </Field>
                </div>
              )}

              {/* No GST notice */}
              {!hasGst && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <Info size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="text-amber-800 font-medium">No GSTIN provided</p>
                    <p className="text-amber-700 mt-0.5">GST (18%) will still be charged as required by law, but you won't receive GST input credit on this invoice.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Review & Pay ─────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <CreditCard size={20} className="text-green-600" /> Review & Pay
              </h2>

              {/* Customer summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600 font-medium mb-2">
                  <User size={14} /> Billed To
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-y-1">
                  <span className="text-slate-500">Name</span>
                  <span className="text-slate-800 font-medium">{form.full_name}</span>
                  <span className="text-slate-500">Company</span>
                  <span className="text-slate-800">{form.company_name}</span>
                  <span className="text-slate-500">Mobile</span>
                  <span className="text-slate-800">{form.mobile}</span>
                  <span className="text-slate-500">Email</span>
                  <span className="text-slate-800 break-all">{form.email}</span>
                  {form.accounts_email && (
                    <>
                      <span className="text-slate-500">Accounts Email</span>
                      <span className="text-slate-800 break-all">{form.accounts_email}</span>
                    </>
                  )}
                  {hasGst && gstNumber && (
                    <>
                      <span className="text-slate-500">GSTIN</span>
                      <span className="text-slate-800 font-mono">{gstNumber}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Plan summary */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-[#0F172A] px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{PLAN_NAME}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{BASE_SLOTS} Employee slots · {PLAN_MONTHS} Month</p>
                  </div>
                  <div className="bg-green-500/20 text-green-400 text-xs font-medium px-2.5 py-1 rounded-full">
                    Monthly
                  </div>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  {orderData && (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>Base amount</span>
                        <span>{INR(orderData.base_amount)}</span>
                      </div>
                      {orderData.cgst_amount > 0 && (
                        <>
                          <div className="flex justify-between text-slate-600">
                            <span>CGST @ 9%</span>
                            <span>{INR(orderData.cgst_amount)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>SGST @ 9%</span>
                            <span>{INR(orderData.sgst_amount)}</span>
                          </div>
                        </>
                      )}
                      {orderData.igst_amount > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>IGST @ 18%</span>
                          <span>{INR(orderData.igst_amount)}</span>
                        </div>
                      )}
                      {!hasGst && (
                        <div className="flex justify-between text-slate-600">
                          <span>GST @ 18%</span>
                          <span>{INR(orderData.gst_amount)}</span>
                        </div>
                      )}
                      <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-bold text-slate-900">
                        <span>Total Amount</span>
                        <span className="text-green-600 text-lg">{INR(orderData.total_amount)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Shield size={13} className="text-green-500" /> Secured by Razorpay
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-green-500" /> GST invoice emailed instantly
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-green-500" /> Subscription activated immediately
                </div>
              </div>

              {/* Pay button */}
              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1A7A4A] text-white
                  text-base font-bold rounded-xl hover:bg-green-700 disabled:opacity-60
                  disabled:cursor-not-allowed transition-colors shadow-lg shadow-green-900/20">
                {paying
                  ? <><Loader2 size={18} className="animate-spin" /> Processing...</>
                  : <><CreditCard size={18} /> Pay {orderData ? INR(orderData.total_amount) : '...'}</>
                }
              </button>
              <p className="text-center text-xs text-slate-400">
                By paying you agree to our{' '}
                <a href="/terms" target="_blank" className="text-green-600 hover:underline">Terms of Service</a>
              </p>
            </div>
          )}

          {/* ── Navigation buttons ─────────────────────────────────────────── */}
          <div className={`flex items-center mt-6 pt-5 border-t border-slate-100
            ${step === 1 ? 'justify-end' : 'justify-between'}`}>
            {step > 1 && (
              <button
                onClick={goBack}
                disabled={paying}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-600
                  bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50">
                <ChevronLeft size={16} /> Back
              </button>
            )}
            {step < 3 && (
              <button
                onClick={goNext}
                className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-medium text-white
                  bg-[#1A7A4A] hover:bg-green-700 rounded-lg transition-colors">
                Continue <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Back link */}
        <p className="text-center text-sm text-slate-500 mt-4">
          <button onClick={() => navigate('/admin/billing')}
            className="text-green-600 hover:underline">
            ← Back to Billing
          </button>
        </p>
      </div>
    </div>
  );
}
