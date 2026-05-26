import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { toast } from 'sonner';
import { MapPin, AlertCircle, ChevronDown, ChevronUp, TrendingDown, TrendingUp } from 'lucide-react';

// ── INR formatter ─────────────────────────────────────────────────────────────
const INR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const EMPTY = {
  employee_id: '', employee_name: '', email: '',
  department: '', designation: '', phone: '', date_of_joining: '', location: '',
  salary: '', yearly_ctc: '', net_salary_monthly: '',
  pan_number: '', uan_number: '', bank_name: '', bank_account_number: '', ifsc_code: '',
  portal_access_enabled: false,
};

// ── Inline field error helper ─────────────────────────────────────────────────
function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
      <AlertCircle size={11} /> {msg}
    </p>
  );
}

// ── Validation helpers ────────────────────────────────────────────────────────
function validateForm(form, isNew) {
  const errors = {};
  if (isNew && !form.employee_id.trim())
    errors.employee_id = 'Employee ID is required';
  else if (isNew && !/^[A-Z0-9_-]{2,20}$/i.test(form.employee_id.trim()))
    errors.employee_id = 'Use only letters, numbers, - or _ (2–20 chars)';

  if (!form.employee_name.trim())
    errors.employee_name = 'Employee name is required';

  if (form.portal_access_enabled && !form.email.trim())
    errors.email = 'Email address is required to enable portal access';
  else if (form.email && form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    errors.email = 'Enter a valid email address';

  if (form.phone && form.phone.trim() && !/^\+?[\d\s\-()]{7,15}$/.test(form.phone.trim()))
    errors.phone = 'Enter a valid phone number';

  if (form.pan_number && form.pan_number.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(form.pan_number.trim()))
    errors.pan_number = 'Format: ABCDE1234F (10 characters)';

  if (form.ifsc_code && form.ifsc_code.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(form.ifsc_code.trim()))
    errors.ifsc_code = 'Format: SBIN0001234 (11 characters)';

  if (form.uan_number && form.uan_number.trim() && !/^\d{12}$/.test(form.uan_number.trim()))
    errors.uan_number = 'UAN must be exactly 12 digits';

  return errors;
}

export default function EmployeeEditDialog({ open, onOpenChange, employee, onSaved }) {
  const isNew = !employee;
  const [form, setForm]             = useState(EMPTY);
  const [errors, setErrors]         = useState({});
  const [saving, setSaving]         = useState(false);
  const [locations, setLocations]   = useState([]);
  const [breakdown, setBreakdown]   = useState(null);   // payroll preview result
  const [showBreakdown, setShowBreakdown] = useState(false);
  const debounceRef = useRef(null);

  // Fetch locations whenever dialog opens
  useEffect(() => {
    if (open) {
      api.get('/locations').then(r => setLocations(r.data)).catch(() => setLocations([]));
    }
  }, [open]);

  useEffect(() => {
    if (employee) {
      setForm({
        employee_id:         employee.employee_id         || '',
        employee_name:       employee.employee_name       || '',
        email:               employee.email               || '',
        department:          employee.department          || '',
        designation:         employee.designation         || '',
        phone:               employee.phone               || '',
        date_of_joining:     employee.date_of_joining     || '',
        location:            employee.location            || '',
        salary:              employee.salary              ? String(employee.salary)              : '',
        yearly_ctc:          employee.yearly_ctc          ? String(employee.yearly_ctc)          : '',
        net_salary_monthly:  employee.net_salary_monthly  ? String(employee.net_salary_monthly)  : '',
        pan_number:           employee.pan_number           || '',
        uan_number:           employee.uan_number           || '',
        bank_name:            employee.bank_name            || '',
        bank_account_number:  employee.bank_account_number  || '',
        ifsc_code:            employee.ifsc_code            || '',
        portal_access_enabled: employee.portal_access_enabled || false,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [employee, open]);

  // ── Live salary breakdown (debounced 600ms) ──────────────────────────────────
  useEffect(() => {
    const salary = parseFloat(form.salary);
    if (!salary || salary <= 0) {
      setBreakdown(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.post('/payroll-config/preview', { salary });
        setBreakdown(data);
        // Auto-fill net_salary_monthly if user hasn't manually entered it
        setForm(f => {
          if (f._net_manual) return f;   // user typed it manually — don't overwrite
          return { ...f, net_salary_monthly: String(Math.round(data.net_salary || 0)) };
        });
      } catch {
        setBreakdown(null);
      }
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.salary]);

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    // Clear error for this field on change
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: undefined }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = validateForm(form, isNew);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error('Please fix the errors before saving');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await api.post('/employees', form);
        toast.success('Employee added successfully');
      } else {
        await api.put(`/employees/${employee.id}`, form);
        toast.success('Employee updated successfully');
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field) =>
    errors[field] ? 'border-red-400 focus:ring-red-300' : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add Employee' : 'Edit Employee'}</DialogTitle>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>

        <form onSubmit={handleSave}>
          <div className="px-6 py-4 space-y-4">

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employee ID <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.employee_id}
                  onChange={set('employee_id')}
                  placeholder="EMP001"
                  disabled={!isNew}
                  className={inputClass('employee_id')}
                />
                <FieldError msg={errors.employee_id} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.employee_name}
                  onChange={set('employee_name')}
                  placeholder="John Smith"
                  className={inputClass('employee_name')}
                />
                <FieldError msg={errors.employee_name} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="john@company.com"
                className={inputClass('email')}
              />
              <FieldError msg={errors.email} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                <Input
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="9876543210"
                  className={inputClass('phone')}
                />
                <FieldError msg={errors.phone} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Joining</label>
                <Input type="date" value={form.date_of_joining} onChange={set('date_of_joining')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <Input value={form.department} onChange={set('department')} placeholder="Engineering" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                <Input value={form.designation} onChange={set('designation')} placeholder="Software Engineer" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} /> Branch / Location
                </span>
              </label>
              {locations.length > 0 ? (
                <select
                  value={form.location}
                  onChange={set('location')}
                  style={{
                    width: '100%', padding: '8px 12px',
                    border: '1px solid #E2E8F0', borderRadius: 8,
                    fontSize: 14, color: form.location ? '#0F172A' : '#94A3B8',
                    background: '#fff', outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="">— Select location —</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.name}>
                      {l.name}{l.city ? ` (${l.city})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <Input value={form.location} onChange={set('location')} placeholder="e.g. Chennai Head Office" />
                  <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                    💡 Add locations in <strong>Locations</strong> settings for a dropdown here.
                  </p>
                </>
              )}
            </div>

            {/* Salary Configuration */}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Salary Configuration</p>
              <div className="grid grid-cols-1 gap-3">

                {/* Monthly Gross */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Gross Salary (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                    <Input
                      type="number"
                      min="0"
                      value={form.salary}
                      onChange={e => {
                        const v = e.target.value;
                        setForm(f => ({
                          ...f,
                          salary: v,
                          yearly_ctc: f._ctc_manual ? f.yearly_ctc : (v ? String(Math.round(parseFloat(v) * 12)) : ''),
                          _net_manual: false,   // reset manual flag when gross changes
                        }));
                      }}
                      placeholder="50000"
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">CTC gross per month — used to calculate PF, ESI, payslip</p>
                </div>

                {/* Yearly CTC + Take-Home row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Yearly CTC (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                      <Input
                        type="number"
                        min="0"
                        value={form.yearly_ctc}
                        onChange={e => setForm(f => ({ ...f, yearly_ctc: e.target.value, _ctc_manual: true }))}
                        placeholder={form.salary ? String(Math.round(parseFloat(form.salary || 0) * 12)) : '600000'}
                        className="pl-7"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Auto-fills as monthly × 12</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Monthly Take-Home (₹)
                      {breakdown && !form._net_manual && (
                        <span className="ml-1 text-green-600 font-normal">(auto)</span>
                      )}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                      <Input
                        type="number"
                        min="0"
                        value={form.net_salary_monthly}
                        onChange={e => setForm(f => ({ ...f, net_salary_monthly: e.target.value, _net_manual: true }))}
                        placeholder={breakdown ? String(Math.round(breakdown.net_salary || 0)) : '43500'}
                        className="pl-7"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {breakdown && !form._net_manual ? 'Auto-calculated from payroll config' : 'Actual credited to bank'}
                    </p>
                  </div>
                </div>

                {/* Live Salary Breakdown Panel */}
                {breakdown && parseFloat(form.salary) > 0 && (
                  <div style={{
                    border: '1.5px solid #E2E8F0', borderRadius: 10,
                    background: '#F8FAFC', overflow: 'hidden',
                  }}>
                    {/* Toggle header */}
                    <button
                      type="button"
                      onClick={() => setShowBreakdown(v => !v)}
                      style={{
                        width: '100%', padding: '9px 14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: showBreakdown ? '1px solid #E2E8F0' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1A7A4A' }}>
                          📊 Salary Breakdown
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px',
                          background: '#DCFCE7', color: '#15803D', borderRadius: 20,
                        }}>
                          Take-home: {INR(breakdown.net_salary)}
                        </span>
                      </div>
                      {showBreakdown ? <ChevronUp size={14} color="#64748B" /> : <ChevronDown size={14} color="#64748B" />}
                    </button>

                    {showBreakdown && (
                      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {/* Earnings */}
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
                          <TrendingUp size={10} style={{ display: 'inline', marginRight: 4, color: '#16a34a' }} />
                          Earnings
                        </p>
                        {Object.entries(breakdown.earnings || {}).map(([key, val]) => {
                          if (!val || val === 0) return null;
                          const label = breakdown.earningLabels?.[key] || key;
                          return (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                              <span style={{ color: '#374151' }}>{label}</span>
                              <span style={{ fontWeight: 600, color: '#0F172A' }}>{INR(val)}</span>
                            </div>
                          );
                        })}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, borderTop: '1px dashed #E2E8F0', paddingTop: 6, marginTop: 4 }}>
                          <span style={{ color: '#15803D' }}>Gross Total</span>
                          <span style={{ color: '#15803D' }}>{INR(breakdown.gross_earnings)}</span>
                        </div>

                        {/* Deductions */}
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginTop: 10, marginBottom: 4 }}>
                          <TrendingDown size={10} style={{ display: 'inline', marginRight: 4, color: '#dc2626' }} />
                          Deductions
                        </p>
                        {Object.entries(breakdown.deductions || {}).map(([key, val]) => {
                          if (!val || val === 0) return null;
                          const label = breakdown.deductionLabels?.[key] || key;
                          return (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                              <span style={{ color: '#374151' }}>{label}</span>
                              <span style={{ fontWeight: 600, color: '#DC2626' }}>− {INR(val)}</span>
                            </div>
                          );
                        })}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, borderTop: '1px dashed #E2E8F0', paddingTop: 6, marginTop: 4 }}>
                          <span style={{ color: '#DC2626' }}>Total Deductions</span>
                          <span style={{ color: '#DC2626' }}>− {INR(breakdown.total_deductions)}</span>
                        </div>

                        {/* Net */}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          fontSize: 13, fontWeight: 800,
                          borderTop: '2px solid #E2E8F0', paddingTop: 8, marginTop: 6,
                        }}>
                          <span style={{ color: '#0F172A' }}>Net Take-Home</span>
                          <span style={{ color: '#1A7A4A' }}>{INR(breakdown.net_salary)}</span>
                        </div>
                        <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
                          * Estimated from your payroll config. Adjust in Payroll Settings.
                        </p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* Statutory Details */}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Statutory Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number</label>
                  <Input
                    value={form.pan_number}
                    onChange={e => { set('pan_number')(e); }}
                    onBlur={e => {
                      if (e.target.value) setForm(f => ({ ...f, pan_number: f.pan_number.toUpperCase() }));
                    }}
                    placeholder="ABCDE1234F"
                    className={inputClass('pan_number')}
                    maxLength={10}
                  />
                  <FieldError msg={errors.pan_number} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UAN (PF Account)</label>
                  <Input
                    value={form.uan_number}
                    onChange={set('uan_number')}
                    placeholder="100123456789"
                    className={inputClass('uan_number')}
                    maxLength={12}
                  />
                  <FieldError msg={errors.uan_number} />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Bank Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                  <Input value={form.bank_name} onChange={set('bank_name')} placeholder="State Bank of India" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                  <Input
                    value={form.ifsc_code}
                    onChange={set('ifsc_code')}
                    onBlur={e => {
                      if (e.target.value) setForm(f => ({ ...f, ifsc_code: f.ifsc_code.toUpperCase() }));
                    }}
                    placeholder="SBIN0001234"
                    className={inputClass('ifsc_code')}
                    maxLength={11}
                  />
                  <FieldError msg={errors.ifsc_code} />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                <Input
                  value={form.bank_account_number}
                  onChange={set('bank_account_number')}
                  placeholder="1234567890"
                  type="text"
                  inputMode="numeric"
                />
              </div>
            </div>

            {/* ── Portal Access ── */}
            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Payroll Portal Access</p>
              <div
                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
                style={{ background: form.portal_access_enabled ? '#F0FDF4' : '#F8FAFC', border: `1.5px solid ${form.portal_access_enabled ? '#86EFAC' : '#E2E8F0'}` }}
                onClick={() => setForm(f => ({ ...f, portal_access_enabled: !f.portal_access_enabled }))}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center mt-0.5 shrink-0 transition-all"
                  style={{ background: form.portal_access_enabled ? '#1A7A4A' : '#fff', border: `2px solid ${form.portal_access_enabled ? '#1A7A4A' : '#CBD5E1'}` }}
                >
                  {form.portal_access_enabled && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: form.portal_access_enabled ? '#15803D' : '#0F172A' }}>
                    Enable Employee Portal Access
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                    {isNew
                      ? 'Employee will receive a welcome email with temporary login credentials.'
                      : form.portal_access_enabled
                        ? 'Employee can log in to view and download their payslips.'
                        : 'Employee cannot log in to the payslip portal.'}
                  </p>
                </div>
              </div>
              {!form.email && form.portal_access_enabled && (
                <p className="text-xs text-amber-600 mt-2">⚠ Email address is required to enable portal access.</p>
              )}
            </div>

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Add Employee' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
