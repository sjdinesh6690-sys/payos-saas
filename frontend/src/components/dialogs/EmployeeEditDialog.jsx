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

// Rough net estimate: Gross minus standard PF + ESI + PT
function estimateNet(gross) {
  if (!gross || isNaN(gross) || gross <= 0) return null;
  const basic = gross * 0.40;
  const pf    = Math.min(basic * 0.12, 1800);
  const esi   = gross <= 21000 ? gross * 0.0075 : 0;
  return Math.max(0, Math.round(gross - pf - esi - 200));
}

export default function EmployeeEditDialog({ open, onOpenChange, employee, onSaved }) {
  const isNew = !employee;
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

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

  // Bidirectional: change gross → update CTC
  const onGrossChange = (e) => {
    const val   = e.target.value;
    const gross = parseFloat(val);
    setForm(f => ({
      ...f,
      salary:     val,
      yearly_ctc: !isNaN(gross) && gross > 0 ? String(Math.round(gross * 12)) : f.yearly_ctc,
    }));
  };

  // Bidirectional: change CTC → update gross
  const onCtcChange = (e) => {
    const val   = e.target.value;
    const ctc   = parseFloat(val);
    const gross = !isNaN(ctc) && ctc > 0 ? Math.round(ctc / 12) : null;
    setForm(f => ({
      ...f,
      yearly_ctc: val,
      salary:     gross ? String(gross) : f.salary,
    }));
  };

  const estimatedNet = estimateNet(parseFloat(form.salary));

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
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Salary Details</p>
                <span className="text-xs text-slate-400">Enter any one — others auto-calculate</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Gross (₹) *</label>
                  <Input type="number" value={form.salary} onChange={onGrossChange} placeholder="50000" required min="0" />
                  <p className="text-xs text-slate-400 mt-1">Before deductions</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Yearly CTC (₹)</label>
                  <Input type="number" value={form.yearly_ctc} onChange={onCtcChange} placeholder="600000" min="0" />
                  <p className="text-xs text-slate-400 mt-1">Annual package</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Net (₹)</label>
                  <Input type="number" value={form.net_salary_monthly} onChange={set('net_salary_monthly')}
                    placeholder={estimatedNet ? String(estimatedNet) : '44000'} min="0" />
                  <p className="text-xs mt-1">
                    {estimatedNet
                      ? <span className="text-orange-600 font-medium">Est. ≈ ₹{estimatedNet.toLocaleString('en-IN')}</span>
                      : <span className="text-slate-400">Take-home</span>}
                  </p>
                </div>
              </div>
              {estimatedNet > 0 && (
                <div className="mt-2 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-xs text-orange-700">
                  💡 Estimated net = Gross minus standard PF + ESI + PT. Actual net is calculated from your Payroll Config when generating payslips.
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
