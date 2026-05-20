import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { toast } from 'sonner';

/**
 * FileUploadDialog
 * Props:
 *   open          boolean
 *   onOpenChange  fn(bool)
 *   type          'employees' | 'payslips'
 *   onUploaded    fn()  — called after successful upload to trigger refetch
 */
export default function FileUploadDialog({ open, onOpenChange, type = 'employees', onUploaded }) {
  const [tab, setTab]         = useState('csv');
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState([]);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef               = useRef(null);

  const isEmployees = type === 'employees';

  const employeeCsvTemplate = `employee_id,employee_name,gross_salary,yearly_ctc,net_salary_monthly,email,department,designation,phone,date_of_joining
EMP001,John Smith,50000,600000,,john@company.com,Engineering,Developer,9876543210,2024-01-15
EMP002,Jane Doe,60000,720000,,jane@company.com,HR,Manager,9876543211,2023-06-01`;

  const payslipCsvTemplate = `employee_id,month,year,salary
EMP001,5,2026,50000
EMP002,5,2026,60000`;

  const template = isEmployees ? employeeCsvTemplate : payslipCsvTemplate;

  const parseCsv = (text) => {
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return obj;
    });
  };

  const handleFile = (f) => {
    setError('');
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseCsv(e.target.result);
        setPreview(rows.slice(0, 5));
        if (rows.length === 0) setError('No data rows found in file.');
      } catch {
        setError('Could not parse file. Make sure it is a valid CSV.');
      }
    };
    reader.readAsText(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const endpoint = isEmployees ? '/employees/upload' : '/payslips/upload';
      const res = await api.post(endpoint, rows);
      toast.success(res.data.message || 'Upload successful');
      onUploaded?.();
      onOpenChange(false);
      setFile(null);
      setPreview([]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([template], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = isEmployees ? 'employees_template.csv' : 'payslips_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setPreview([]);
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Upload {isEmployees ? 'Employees' : 'Payslips'} — CSV File
          </DialogTitle>
          <DialogClose onClose={() => { reset(); onOpenChange(false); }} />
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <FileText size={16} />
              <span>Download our CSV template to get started</span>
            </div>
            <Button type="button" variant="outline" className="h-8 text-xs border-blue-300 text-blue-700" onClick={downloadTemplate}>
              Download Template
            </Button>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }}
            />
            <Upload size={32} className="mx-auto text-slate-300 mb-3" />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 size={16} className="text-green-600" />
                <span className="text-sm font-medium text-slate-700">{file.name}</span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); reset(); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-600">Click or drag & drop a CSV file</p>
                <p className="text-xs text-slate-400 mt-1">Only .csv files supported</p>
              </>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Preview (first {preview.length} rows)</p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {Object.keys(preview[0]).map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-3 py-2 text-slate-700 whitespace-nowrap">{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button type="button" onClick={handleUpload} disabled={!file || loading || !!error}>
            {loading ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
