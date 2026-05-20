import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { toast } from 'sonner';

const EMPTY = {
  employee_id: '', employee_name: '', email: '',
  salary: '', yearly_ctc: '', net_salary_monthly: '',
  department: '', designation: '', phone: '', date_of_joining: '',
  pan_number: '', uan_number: '', bank_name: '', bank_account_number: '', ifsc_code: '',
};

// ── Payroll engine (mirrors backend) ─────────────────────────────────────────
function calcNet(gross, config) {
  if (!gross || !config || gross <= 0) return 0;
  const earnings = {};
  const sortedE = [...(config.earnings || [])].filter(c => c.enabled).sort((a, b) => (a.order || 0) - (b.order || 0));
  for (const c of sortedE) {
    const basic = earnings['basic'] || 0;
    let amt = 0;
    if (c.type === 'pct_of_gross')  amt = (gross * c.value) / 100;
    else if (c.type === 'pct_of_basic') amt = (basic * c.value) / 100;
    else if (c.type === 'fixed')    amt = c.value;
    else if (c.type === 'remainder') {
      const used = Object.values(earnings).reduce((s, v) => s + v, 0);
      amt = Math.max(0, gross - used);
    }
    earnings[c.key] = amt;
  }
  const basic = earnings['basic'] || 0;
  let totalD = 0;
  const sortedD = [...(config.deductions || [])].filter(c => c.enabled && c.type !== 'manual' && c.type !== 'lop').sort((a, b) => (a.order || 0) - (b.order || 0));
  for (const c of sortedD) {
    let amt = 0;
    if (c.type === 'pct_of_basic') { amt = (basic * c.value) / 100; if (c.cap) amt = Math.min(amt, c.cap); }
    else if (c.type === 'pct_of_gross') {
      if (c.threshold && c.threshold_type === 'max_gross' && gross > c.threshold) amt = 0;
      else { amt = (gross * c.value) / 100; if (c.cap) amt = Math.min(amt, c.cap); }
    }
    else if (c.type === 'fixed') amt = c.value;
    totalD += amt;
  }
  return Math.max(0, Math.round(gross - totalD));
}

// Binary search: find gross that produces the target net
function grossFromNet(targetNet, config) {
  if (!targetNet || !config || targetNet <= 0) return null;
  let lo = targetNet, hi = targetNet * 3;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const net = calcNet(mid, config);
    if (Math.abs(net - targetNet) < 0.5) return Math.round(mid);
    if (net < targetNet) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

export default function EmployeeEditDialog({ open, onOpenChange, employee, onSaved }) {
  const isNew = !employee;
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [config, setConfig]   = useState(null);   // payroll config from API
  const [configLoading, setConfigLoading] = useState(false);

  // Fetch payroll config when dialog opens
  useEffect(() => {
    if (!open) return;
    setConfigLoading(true);
    api.get('/payroll-config')
      .then(r => setConfig(r.data.config || null))
      .catch(() => setConfig(null))
      .finally(() => setConfigLoading(false));
  }, [open]);

  useEffect(() => {
    if (employee) {
      const gross = employee.salary != null ? String(employee.salary) : '';
      const ctc   = employee.yearly_ctc != null
        ? String(employee.yearly_ctc)
        : (employee.salary ? String(Math.round(Number(employee.salary) * 12)) : '');
      setForm({
        employee_id:         employee.employee_id         || '',
        employee_name:       employee.employee_name       || '',
        email:               employee.email               || '',
        salary:              gross,
        yearly_ctc:          ctc,
        net_salary_monthly:  employee.net_salary_monthly != null ? String(employee.net_salary_monthly) : '',
        department:          employee.department          || '',
        designation:         employee.designation         || '',
        phone:               employee.phone               || '',
        date_of_joining:     employee.date_of_joining     || '',
        pan_number:          employee.pan_number          || '',
        uan_number:          employee.uan_number          || '',
        bank_name:           employee.bank_name           || '',
        bank_account_number: employee.bank_account_number || '',
        ifsc_code:           employee.ifsc_code           || '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [employee, open]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  // ── Gross changed → auto-fill CTC and Net ─────────────────────────────────
  const onGrossChange = (e) => {
    const val   = e.target.value;
    const gross = parseFloat(val);
    const net   = (!isNaN(gross) && gross > 0 && config) ? String(calcNet(gross, config)) : '';
    setForm(f => ({
      ...f,
      salary:             val,
      yearly_ctc:         !isNaN(gross) && gross > 0 ? String(Math.round(gross * 12)) : f.yearly_ctc,
      net_salary_monthly: net || f.net_salary_monthly,
    }));
  };

  // ── CTC changed → derive gross → fill Net ─────────────────────────────────
  const onCtcChange = (e) => {
    const val   = e.target.value;
    const ctc   = parseFloat(val);
    const gross = (!isNaN(ctc) && ctc > 0) ? Math.round(ctc / 12) : null;
    const net   = (gross && config) ? String(calcNet(gross, config)) : '';
    setForm(f => ({
      ...f,
      yearly_ctc:         val,
      salary:             gross ? String(gross) : f.salary,
      net_salary_monthly: net || f.net_salary_monthly,
    }));
  };

  // ── Net changed → reverse-calculate gross → fill CTC ──────────────────────
  const onNetChange = (e) => {
    const val    = e.target.value;
    const net    = parseFloat(val);
    const gross  = (!isNaN(net) && net > 0 && config) ? grossFromNet(net, config) : null;
    setForm(f => ({
      ...f,
      net_salary_monthly: val,
      salary:             gross ? String(gross) : f.salary,
      yearly_ctc:         gross ? String(gross * 12) : f.yearly_ctc,
    }));
  };

  // Computed net preview from current gross (using real config)
  const computedNet = config && form.salary ? calcNet(parseFloat(form.salary), config) : null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        await api.post('/employees', form);
        toast.success('Employee added');
      } else {
        await api.put(`/employees/${employee.id}`, form);
        toast.success('Employee updated');
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add Employee' : 'Edit Employee'}</DialogTitle>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>

        <form onSubmit={handleSave}>
          <div className="px-6 py-4 space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID *</label>
                <Input value={form.employee_id} onChange={set('employee_id')} placeholder="EMP001" required disabled={!isNew} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <Input value={form.employee_name} onChange={set('employee_name')} placeholder="John Smith" required />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
              <Input type="email" value={form.email} onChange={set('email')} placeholder="john@company.com" required />
            </div>

            {/* ── Salary fields ─────────────────────────────────────────────── */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Salary Details</p>
                <span className="text-xs text-slate-400">
                  {configLoading ? '⏳ Loading config…' : config ? '✅ Using your Payroll Config' : '⚠️ No config — set up Payroll Config first'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">Enter any one field — the others auto-calculate using your Payroll Config.</p>

              <div className="grid grid-cols-3 gap-3">
                {/* Monthly Gross */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Gross (₹) *</label>
                  <Input type="number" value={form.salary} onChange={onGrossChange} placeholder="50000" required min="0" />
                  <p className="text-xs text-slate-400 mt-1">Before deductions</p>
                </div>

                {/* Yearly CTC */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Yearly CTC (₹)</label>
                  <Input type="number" value={form.yearly_ctc} onChange={onCtcChange} placeholder="600000" min="0" />
                  <p className="text-xs text-slate-400 mt-1">Annual package</p>
                </div>

                {/* Monthly Net */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Net (₹)</label>
                  <Input
                    type="number"
                    value={form.net_salary_monthly}
                    onChange={onNetChange}
                    placeholder={computedNet ? String(computedNet) : '44000'}
                    min="0"
                  />
                  <p className="text-xs mt-1">
                    {computedNet
                      ? <span className="text-green-700 font-medium">Calc: ₹{computedNet.toLocaleString('en-IN')}</span>
                      : <span className="text-slate-400">Take-home pay</span>}
                  </p>
                </div>
              </div>

              {/* Info banner */}
              {computedNet > 0 && (
                <div className="mt-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-800">
                  ✅ Net calculated using your Payroll Config deductions (PF, ESI, PT, etc.). Manual deductions like TDS are applied at payslip generation time.
                </div>
              )}
              {!config && !configLoading && (
                <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800">
                  ⚠️ Payroll Config not set up — go to <strong>Payroll Config</strong> page to configure your deduction rules. Net salary will be calculated from that.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                <Input value={form.phone} onChange={set('phone')} placeholder="+91 9876543210" />
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

            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Statutory Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number</label>
                  <Input value={form.pan_number} onChange={set('pan_number')} placeholder="ABCDE1234F" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UAN (PF Account)</label>
                  <Input value={form.uan_number} onChange={set('uan_number')} placeholder="100123456789" />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Bank Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                  <Input value={form.bank_name} onChange={set('bank_name')} placeholder="State Bank of India" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                  <Input value={form.ifsc_code} onChange={set('ifsc_code')} placeholder="SBIN0001234" />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                <Input value={form.bank_account_number} onChange={set('bank_account_number')} placeholder="1234567890" />
              </div>
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
