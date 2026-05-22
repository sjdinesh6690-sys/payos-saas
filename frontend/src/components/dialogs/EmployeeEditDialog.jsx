import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { toast } from 'sonner';

const EMPTY = {
  employee_id: '', employee_name: '', email: '',
  department: '', designation: '', phone: '', date_of_joining: '', location: '',
  pan_number: '', uan_number: '', bank_name: '', bank_account_number: '', ifsc_code: '',
};

export default function EmployeeEditDialog({ open, onOpenChange, employee, onSaved }) {
  const isNew = !employee;
  const [form, setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);

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

            {/* Basic Info */}
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch / Location</label>
              <Input value={form.location} onChange={set('location')} placeholder="e.g. Chennai Head Office, Warehouse B" />
            </div>

            {/* Salary Info Banner */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 text-xs text-blue-800">
              💡 <strong>Salary is managed via payslip upload.</strong> Once a payslip is generated, the last paid salary will appear automatically in the employee list.
            </div>

            {/* Statutory Details */}
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
