import { useState, useEffect } from 'react';
import { MapPin, Plus, Pencil, Trash2, X, Check, Building2, Users, RefreshCw, FileText, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

const TEMPLATES = [
  { value: 'modern',    label: 'Modern (Default)' },
  { value: 'classic',   label: 'Classic' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'minimal',   label: 'Minimal' },
  { value: 'premium',   label: 'Premium' },
];

// ── Small inline form for add / edit ─────────────────────────────────────────
function LocationForm({ initial = {}, onSave, onCancel, loading }) {
  const [name,             setName]             = useState(initial.name              || '');
  const [city,             setCity]             = useState(initial.city              || '');
  const [state,            setState]            = useState(initial.state             || '');
  const [address,          setAddress]          = useState(initial.address           || '');
  const [separatePayslip,  setSeparatePayslip]  = useState(!!initial.separate_payslip);
  const [payslipTemplate,  setPayslipTemplate]  = useState(initial.payslip_template || 'modern');

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    border: '1.5px solid #E2E8F0',
    borderRadius: 10,
    fontSize: 14,
    color: '#0F172A',
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
  };

  const handleSave = () => {
    onSave({
      name:              name.trim(),
      city:              city.trim(),
      state:             state.trim(),
      address:           address.trim(),
      separate_payslip:  separatePayslip,
      payslip_template:  payslipTemplate,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Location name */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 4, display: 'block' }}>
          Location Name *
        </label>
        <input
          autoFocus
          placeholder="e.g. Head Office, Warehouse A, Chennai Branch"
          value={name}
          onChange={e => setName(e.target.value)}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = '#1A7A4A'}
          onBlur={e => e.target.style.borderColor = '#E2E8F0'}
        />
      </div>

      {/* City + State */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 4, display: 'block' }}>
            City
          </label>
          <input
            placeholder="e.g. Chennai"
            value={city}
            onChange={e => setCity(e.target.value)}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#1A7A4A'}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 4, display: 'block' }}>
            State
          </label>
          <input
            placeholder="e.g. Tamil Nadu"
            value={state}
            onChange={e => setState(e.target.value)}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#1A7A4A'}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
          />
        </div>
      </div>

      {/* Separate Payslip toggle */}
      <div
        onClick={() => setSeparatePayslip(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
          border: `1.5px solid ${separatePayslip ? '#86EFAC' : '#E2E8F0'}`,
          background: separatePayslip ? '#F0FDF4' : '#F8FAFC',
          transition: 'all 0.15s',
        }}
      >
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: separatePayslip ? '#15803D' : '#374151', marginBottom: 2 }}>
            Separate Payslip for this Location?
          </p>
          <p style={{ fontSize: 12, color: '#64748B' }}>
            Use a different address and template for employees in this location
          </p>
        </div>
        {separatePayslip
          ? <ToggleRight size={28} color="#1A7A4A" />
          : <ToggleLeft  size={28} color="#94A3B8" />}
      </div>

      {/* Address + Template — only shown when separate payslip is ON */}
      {separatePayslip && (
        <>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 4, display: 'block' }}>
              Location Address <span style={{ fontWeight: 400, color: '#94A3B8' }}>(shown on payslip header)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. No.12, Industrial Estate, Guindy, Chennai – 600 032"
              value={address}
              onChange={e => setAddress(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              onFocus={e => e.target.style.borderColor = '#1A7A4A'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 4, display: 'block' }}>
              Payslip Template
            </label>
            <select
              value={payslipTemplate}
              onChange={e => setPayslipTemplate(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
              onFocus={e => e.target.style.borderColor = '#1A7A4A'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'}
            >
              {TEMPLATES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px', borderRadius: 8, border: '1.5px solid #E2E8F0',
            background: '#fff', color: '#64748B', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading || !name.trim()}
          style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: !name.trim() ? '#94A3B8' : '#1A7A4A',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: !name.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {loading
            ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
            : <><Check size={13} /> Save</>}
        </button>
      </div>
    </div>
  );
}

// ── Location card ─────────────────────────────────────────────────────────────
function LocationCard({ loc, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div style={{
      background: '#fff',
      border: '2px solid #E2E8F0',
      borderRadius: 16,
      padding: '20px 22px',
      position: 'relative',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#1A7A4A'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,122,74,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Icon + Name */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Building2 size={20} color="#1A7A4A" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 800, fontSize: 16, color: '#0F172A', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {loc.name}
          </p>
          <p style={{ fontSize: 13, color: '#64748B' }}>
            {[loc.city, loc.state].filter(Boolean).join(', ') || 'No city / state set'}
          </p>
        </div>
      </div>

      {/* Badges row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Users size={13} color="#94A3B8" />
          <span style={{ fontSize: 13, color: '#64748B' }}>
            <strong style={{ color: '#0F172A' }}>{loc.employee_count || 0}</strong> employee{loc.employee_count !== 1 ? 's' : ''}
          </span>
        </div>
        {loc.separate_payslip && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 9px', borderRadius: 20,
            background: '#EFF6FF', border: '1px solid #BFDBFE',
            fontSize: 11, fontWeight: 700, color: '#1D4ED8',
          }}>
            <FileText size={10} /> Separate Payslip
          </span>
        )}
      </div>

      {/* Address (if set) */}
      {loc.address && (
        <p style={{
          fontSize: 12, color: '#64748B', marginBottom: 14,
          padding: '7px 10px', background: '#F8FAFC', borderRadius: 8,
          borderLeft: '3px solid #E2E8F0', lineHeight: 1.5,
        }}>
          {loc.address}
        </p>
      )}

      {/* Actions */}
      {confirmDelete ? (
        <div style={{
          background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 10,
          padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>Remove this location?</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', fontSize: 12, cursor: 'pointer' }}
            >No</button>
            <button
              onClick={() => onDelete(loc.id)}
              style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#DC2626', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >Yes, Remove</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onEdit(loc)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8,
              border: '1.5px solid #E2E8F0', background: '#F8FAFC',
              color: '#374151', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            <Pencil size={13} /> Edit
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              padding: '8px 12px', borderRadius: 8,
              border: '1.5px solid #FEE2E2', background: '#FEF2F2',
              color: '#DC2626', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  // showAdd = true → show add form
  // editId  = number → show edit form for that id
  const [showAdd, setShowAdd] = useState(false);
  const [editId,  setEditId]  = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/locations');
      setLocations(r.data);
    } catch {
      toast.error('Could not load locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (data) => {
    if (!data.name) return;
    setSaving(true);
    try {
      const r = await api.post('/locations', data);
      setLocations(prev => [...prev, { ...r.data, employee_count: 0 }].sort((a,b) => a.name.localeCompare(b.name)));
      setShowAdd(false);
      toast.success(`"${r.data.name}" added`);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not add location');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (data) => {
    setSaving(true);
    try {
      const r = await api.put(`/locations/${editId}`, data);
      setLocations(prev =>
        prev.map(l => l.id === editId ? { ...l, ...r.data } : l)
            .sort((a,b) => a.name.localeCompare(b.name))
      );
      setEditId(null);
      toast.success('Location updated');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not update location');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/locations/${id}`);
      setLocations(prev => prev.filter(l => l.id !== id));
      toast.success('Location removed');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not remove location');
    }
  };

  const editingLoc = locations.find(l => l.id === editId);

  return (
    <div className="p-6 max-w-4xl space-y-6">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
            Locations
          </h1>
          <p style={{ fontSize: 14, color: '#64748B' }}>
            Add your office branches or work sites. Employees can then be assigned to a location.
          </p>
        </div>
        {!showAdd && (
          <button
            onClick={() => { setShowAdd(true); setEditId(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: '#1A7A4A', color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(26,122,74,0.25)',
            }}
          >
            <Plus size={16} /> Add Location
          </button>
        )}
      </div>

      {/* Add form card */}
      {showAdd && (
        <div style={{
          background: '#F0FDF4', border: '2px solid #86EFAC', borderRadius: 16, padding: '20px 22px',
        }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: '#15803D', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Plus size={16} /> New Location
          </p>
          <LocationForm
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
            loading={saving}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
          <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', color: '#1A7A4A' }} />
        </div>
      )}

      {/* Empty state */}
      {!loading && locations.length === 0 && !showAdd && (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: '#F8FAFC', border: '2px dashed #E2E8F0', borderRadius: 16,
        }}>
          <MapPin size={36} color="#CBD5E1" style={{ marginBottom: 12 }} />
          <p style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 6 }}>No locations yet</p>
          <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20 }}>
            Add your first office or branch. Employees can then be assigned to it.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              padding: '10px 22px', borderRadius: 10, border: 'none',
              background: '#1A7A4A', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Add First Location
          </button>
        </div>
      )}

      {/* Location cards grid */}
      {!loading && locations.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {locations.map(loc => (
            editId === loc.id ? (
              /* Inline edit form replaces the card */
              <div key={loc.id} style={{
                background: '#FFF7ED', border: '2px solid #FED7AA', borderRadius: 16, padding: '20px 22px',
              }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#C2410C', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Pencil size={13} /> Editing: {loc.name}
                </p>
                <LocationForm
                  initial={loc}
                  onSave={handleEdit}
                  onCancel={() => setEditId(null)}
                  loading={saving}
                />
              </div>
            ) : (
              <LocationCard
                key={loc.id}
                loc={loc}
                onEdit={l => { setEditId(l.id); setShowAdd(false); }}
                onDelete={handleDelete}
              />
            )
          ))}
        </div>
      )}

      {/* Footer tip */}
      {!loading && locations.length > 0 && (
        <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '14px 18px' }}>
          <p style={{ fontSize: 13, color: '#64748B' }}>
            💡 <strong style={{ color: '#374151' }}>Tip:</strong> Once you add locations here, they appear as a dropdown when you edit an employee — so you can quickly assign each person to the right branch.
          </p>
        </div>
      )}

    </div>
  );
}
