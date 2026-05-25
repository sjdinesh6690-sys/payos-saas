import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Pencil, Trash2, Shield, Eye, EyeOff,
  CheckCircle2, XCircle, AlertCircle, X, Copy, Key,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// ── All modules that can be controlled ───────────────────────────────────────
const ALL_MODULES = [
  { key: 'employees',     label: 'Employees',     desc: 'View & manage employee master' },
  { key: 'payslips',      label: 'Payslips',       desc: 'View payslip history' },
  { key: 'upload',        label: 'Upload Salary',  desc: 'Upload CSV salary data' },
  { key: 'send',          label: 'Generate & Send',desc: 'Generate payslips and email employees' },
  { key: 'attendance',    label: 'Attendance',     desc: 'Mark and view attendance' },
  { key: 'reports',       label: 'Reports',        desc: 'Download statutory reports' },
  { key: 'analytics',     label: 'Analytics',      desc: 'View payroll analytics' },
  { key: 'leave_policy',  label: 'Leave Policy',   desc: 'Configure leave rules' },
  { key: 'locations',     label: 'Locations',      desc: 'Manage office branches' },
  { key: 'payroll_config',label: 'Payroll Config', desc: 'Edit salary components' },
  { key: 'settings',      label: 'Settings',       desc: 'Company settings & branding' },
  { key: 'billing',       label: 'Billing',        desc: 'View subscription & payments' },
];

const DEFAULT_PERMS = Object.fromEntries(ALL_MODULES.map(m => [m.key, false]));

// ── Add / Edit User Dialog ────────────────────────────────────────────────────
function UserDialog({ user, onClose, onSaved }) {
  const isNew = !user;
  const [form, setForm] = useState({
    name:        user?.name        || '',
    email:       user?.email       || '',
    password:    '',
    role:        user?.role        || 'staff',
    permissions: user?.permissions ? { ...DEFAULT_PERMS, ...user.permissions } : { ...DEFAULT_PERMS },
    status:      user?.status      || 'active',
  });
  const [showPwd, setShowPwd]   = useState(false);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: undefined }));
  };
  const togglePerm = (key) =>
    setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }));
  const setAllPerms = (val) =>
    setForm(f => ({ ...f, permissions: Object.fromEntries(ALL_MODULES.map(m => [m.key, val])) }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Invalid email';
    // Password is optional for new users (auto-generated if blank)
    if (form.password && form.password.length < 6)
      e.password = 'Password must be at least 6 characters';
    return e;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password; // don't send empty password on edit
      if (isNew) {
        await api.post('/users', payload);
        toast.success('User added successfully');
      } else {
        await api.put(`/users/${user.id}`, payload);
        toast.success('User updated successfully');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const enabledCount = Object.values(form.permissions).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <p className="font-bold text-slate-900">{isNew ? 'Add Team Member' : 'Edit Team Member'}</p>
            <p className="text-xs text-slate-500 mt-0.5">Set their login details and what they can access</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
              <Input value={form.name} onChange={set('name')} placeholder="e.g. Priya Kumar" />
              {errors.name && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={11}/>{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
              <select
                value={form.role}
                onChange={set('role')}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="staff">Staff</option>
                <option value="hr">HR Manager</option>
                <option value="accountant">Accountant</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
            <Input type="email" value={form.email} onChange={set('email')} placeholder="priya@yourcompany.com" />
            {errors.email && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={11}/>{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isNew ? 'Password' : 'New Password'}
              {isNew
                ? <span className="text-slate-400 font-normal ml-1">(leave blank to auto-generate)</span>
                : <span className="text-slate-400 font-normal ml-1">(leave blank to keep current)</span>}
            </label>
            <div className="relative">
              <Input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder={isNew ? 'Leave blank — a password will be emailed to them' : 'Enter new password to change'}
              />
              <button type="button" onClick={() => setShowPwd(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
            {isNew && !form.password && (
              <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                ✉ A temporary password will be sent to their email automatically.
              </p>
            )}
            {errors.password && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={11}/>{errors.password}</p>}
          </div>

          {/* Module access */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Module Access</p>
                <p className="text-xs text-slate-500">{enabledCount} of {ALL_MODULES.length} modules enabled</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAllPerms(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded-md px-2.5 py-1">
                  Enable All
                </button>
                <button onClick={() => setAllPerms(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 font-medium border border-slate-200 rounded-md px-2.5 py-1">
                  Disable All
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {ALL_MODULES.map(mod => (
                <label key={mod.key}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    form.permissions[mod.key]
                      ? 'border-green-200 bg-green-50'
                      : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                  }`}>
                  <input
                    type="checkbox"
                    checked={!!form.permissions[mod.key]}
                    onChange={() => togglePerm(mod.key)}
                    className="w-4 h-4 accent-green-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{mod.label}</p>
                    <p className="text-xs text-slate-500">{mod.desc}</p>
                  </div>
                  {form.permissions[mod.key]
                    ? <CheckCircle2 size={15} className="text-green-600 shrink-0"/>
                    : <XCircle size={15} className="text-slate-300 shrink-0"/>}
                </label>
              ))}
            </div>
          </div>

          {!isNew && (
            <div className="border-t border-slate-100 pt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-2">Account Status</label>
              <div className="flex gap-2">
                {['active', 'inactive'].map(s => (
                  <button key={s} type="button"
                    onClick={() => setForm(f => ({ ...f, status: s }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.status === s
                        ? s === 'active' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}>
                    {s === 'active' ? '✓ Active' : '✗ Inactive'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60">
            {saving ? 'Saving…' : isNew ? 'Add User' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main UsersPage ────────────────────────────────────────────────────────────
const ROLE_LABEL = { staff: 'Staff', hr: 'HR Manager', accountant: 'Accountant', manager: 'Manager' };
const ROLE_COLOR = {
  staff:      'bg-slate-100 text-slate-700',
  hr:         'bg-blue-100 text-blue-700',
  accountant: 'bg-purple-100 text-purple-700',
  manager:    'bg-orange-100 text-orange-700',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const isSubUser = localStorage.getItem('payslip_is_sub_user') === 'true';

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn:  () => api.get('/users').then(r => r.data),
    enabled:  !isSubUser, // sub-users can't manage users
  });

  const [dialogUser, setDialogUser] = useState(null); // null = closed, 'new' = add, object = edit
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleting, setDeleting]           = useState(false);

  const refetch = () => qc.invalidateQueries({ queryKey: ['users'] });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      toast.success(`${deleteTarget.name} removed`);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    } finally { setDeleting(false); }
  };

  const copyCredentials = (user) => {
    navigator.clipboard.writeText(`Email: ${user.email}\n(Password set during user creation)`);
    toast.success('Email copied to clipboard');
  };

  if (isSubUser) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Shield size={48} className="text-slate-200 mb-4" />
        <h2 className="text-xl font-bold text-slate-700 mb-2">Access Restricted</h2>
        <p className="text-slate-500 text-sm text-center max-w-xs">
          Only the main administrator can manage team members and their access.
        </p>
      </div>
    );
  }

  const activeUsers   = users.filter(u => u.status === 'active');
  const inactiveUsers = users.filter(u => u.status !== 'active');

  return (
    <div className="p-6 space-y-6">
      {/* Dialogs */}
      {dialogUser !== null && (
        <UserDialog
          user={dialogUser === 'new' ? null : dialogUser}
          onClose={() => setDialogUser(null)}
          onSaved={refetch}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <p className="font-bold text-slate-900 mb-2">Remove {deleteTarget.name}?</p>
            <p className="text-sm text-slate-500 mb-5">
              They will immediately lose access to the system. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">
                {deleting ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Access</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage who can log into PayLeef and what they can see
          </p>
        </div>
        <Button className="h-9 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setDialogUser('new')}>
          <Plus size={14} className="mr-1.5" /> Add Team Member
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-3">
        <Shield size={16} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>How it works:</strong> You are the main admin with full access.
          Add team members (HR, accountants, managers) below and choose exactly which modules they can use.
          They log in using their email + password — just like you.
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Team Members',    value: users.length },
          { label: 'Active',          value: activeUsers.length },
          { label: 'Inactive',        value: inactiveUsers.length },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-xl font-bold mt-1 text-slate-800">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users table */}
      <Card>
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="font-medium text-slate-600 mb-1">No team members yet</p>
            <p className="text-sm text-slate-400 mb-4">
              Add your HR or accounting staff so they can manage payroll with you.
            </p>
            <Button className="h-9 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setDialogUser('new')}>
              <Plus size={14} className="mr-1.5" /> Add First Team Member
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Name', 'Role', 'Email', 'Modules Access', 'Status', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => {
                  const perms = u.permissions || {};
                  const enabledModules = ALL_MODULES.filter(m => perms[m.key]);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-400">Added {new Date(u.created_at).toLocaleDateString('en-IN')}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLOR[u.role] || ROLE_COLOR.staff}`}>
                          {ROLE_LABEL[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        {enabledModules.length === 0 ? (
                          <span className="text-xs text-slate-400">No access</span>
                        ) : enabledModules.length === ALL_MODULES.length ? (
                          <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">Full Access</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {enabledModules.slice(0, 3).map(m => (
                              <span key={m.key} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">
                                {m.label}
                              </span>
                            ))}
                            {enabledModules.length > 3 && (
                              <span className="text-xs text-slate-500">+{enabledModules.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.status === 'active'
                          ? <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">Active</span>
                          : <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">Inactive</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => copyCredentials(u)}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Copy email">
                            <Copy size={14} />
                          </button>
                          <button onClick={() => setDialogUser(u)}
                            className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600" title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setDeleteTarget(u)}
                            className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600" title="Remove">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
