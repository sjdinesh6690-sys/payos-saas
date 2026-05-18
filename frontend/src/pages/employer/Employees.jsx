import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { UserPlus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Employees() {
  const [employees, setEmployees]   = useState([]);
  const [loading,   setLoading]     = useState(true);
  const [showAdd,   setShowAdd]     = useState(false);
  const [editId,    setEditId]      = useState(null);
  const [delId,     setDelId]       = useState(null);
  const [form,      setForm]        = useState({ employee_id: '', employee_name: '', department: '' });
  const [editForm,  setEditForm]    = useState({ employee_name: '', department: '' });
  const { token } = useAuth();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/employer/employees', { headers: { Authorization: `Bearer ${token}` } });
      setEmployees(data);
    } catch { toast.error('Failed to load employees.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addEmployee = async () => {
    if (!form.employee_id || !form.employee_name) return toast.error('ID and name required.');
    try {
      await axios.post('/api/employer/employees', form, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Employee added!');
      setShowAdd(false);
      setForm({ employee_id: '', employee_name: '', department: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add.'); }
  };

  const saveEdit = async (id) => {
    try {
      await axios.put(`/api/employer/employees/${id}`, editForm, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Updated!');
      setEditId(null);
      load();
    } catch { toast.error('Update failed.'); }
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/employer/employees/${delId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Employee removed.');
      setDelId(null);
      load();
    } catch { toast.error('Delete failed.'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zoho-text">Employees</h1>
          <p className="text-sm text-zoho-muted mt-0.5">{employees.length} employees registered</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <UserPlus size={16} /> Add Employee
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-10 text-center text-zoho-muted">Loading…</div>
        ) : employees.length === 0 ? (
          <div className="p-10 text-center text-zoho-muted">No employees yet.</div>
        ) : (
          <table className="table-zoho">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id}>
                  <td><span className="badge-info">{e.employee_id}</span></td>
                  <td>
                    {editId === e.id ? (
                      <input className="input py-1 text-xs w-40" value={editForm.employee_name}
                        onChange={ev => setEditForm(f => ({ ...f, employee_name: ev.target.value }))} />
                    ) : (
                      <span className="font-medium">{e.employee_name}</span>
                    )}
                  </td>
                  <td>
                    {editId === e.id ? (
                      <input className="input py-1 text-xs w-32" value={editForm.department}
                        onChange={ev => setEditForm(f => ({ ...f, department: ev.target.value }))} />
                    ) : (
                      <span className="text-zoho-muted">{e.department || '-'}</span>
                    )}
                  </td>
                  <td className="text-zoho-muted text-xs">{e.created_at?.slice(0, 10)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {editId === e.id ? (
                        <>
                          <button onClick={() => saveEdit(e.id)} className="text-green-600 hover:text-green-800 p-1"><Check size={15} /></button>
                          <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={15} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(e.id); setEditForm({ employee_name: e.employee_name, department: e.department || '' }); }}
                            className="text-zoho-blue hover:text-blue-800 p-1"><Pencil size={15} /></button>
                          <button onClick={() => setDelId(e.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={15} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-zoho-text">Add Employee</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zoho-text mb-1">Employee ID</label>
                <input className="input" placeholder="e.g. EMP001" value={form.employee_id}
                  onChange={e => setForm(f => ({ ...f, employee_id: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zoho-text mb-1">Full Name</label>
                <input className="input" placeholder="John Smith" value={form.employee_name}
                  onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zoho-text mb-1">Department (optional)</label>
                <input className="input" placeholder="Engineering" value={form.department}
                  onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={addEmployee} className="btn-primary flex-1 justify-center">Add Employee</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {delId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-zoho-text">Remove Employee?</h3>
              <button onClick={() => setDelId(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-zoho-muted">This will remove the employee record. Their payslips will not be deleted.</p>
              <div className="flex gap-2">
                <button onClick={() => setDelId(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={confirmDelete} className="btn-danger flex-1 justify-center">Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
