import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, LogOut, Sparkles, Send, X, Loader2, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

const QUICK_QUESTIONS = [
  'Why is my salary different this month?',
  'How is my PF calculated?',
  'What are my deductions?',
  'What is my take-home pay this month?',
];

// ── AI Chat Panel ─────────────────────────────────────────────────────────────
function AIChatPanel({ onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: 'Hi! 👋 I\'m your payroll assistant. Ask me anything about your salary, deductions, or payslips.',
    },
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');

    setMessages(m => [...m, { role: 'user', text: q }]);
    setLoading(true);

    try {
      const res  = await fetch('/api/ai/employee-chat', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${localStorage.getItem('payslip_token')}`,
        },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages(m => [...m, { role: 'ai', text: data.error || 'Sorry, I could not answer that right now. Please try again.' }]);
      } else {
        setMessages(m => [...m, { role: 'ai', text: data.answer }]);
      }
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Could not connect to the AI service. Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 sm:w-96 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 bg-white flex flex-col"
         style={{ maxHeight: '520px' }}>

      {/* Chat header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">PayLeef AI Assistant</p>
            <p className="text-xs text-purple-200">Ask about your salary</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 text-white">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'ai' && (
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                <Sparkles size={11} className="text-purple-600" />
              </div>
            )}
            <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
              m.role === 'user'
                ? 'bg-purple-600 text-white rounded-tr-sm'
                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm shadow-sm'
            }`}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
              <Sparkles size={11} className="text-purple-600" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm">
              <div className="flex items-center gap-1.5">
                <Loader2 size={12} className="text-purple-400 animate-spin" />
                <span className="text-xs text-slate-400">Thinking…</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      {messages.length <= 1 && (
        <div className="px-3 pb-2 bg-slate-50 flex-shrink-0">
          <p className="text-[10px] text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Quick Questions</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-slate-200 px-3 py-2 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your salary…"
            disabled={loading}
            className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-full px-3 py-2 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 placeholder:text-slate-400 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Employee Payslips Page ───────────────────────────────────────────────
export default function EmployeePayslipsPage() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const navigate = useNavigate();
  const name = localStorage.getItem('employee_name') || 'Employee';

  useEffect(() => {
    fetch('/api/payslips/employee-payslips', {
      headers: { Authorization: `Bearer ${localStorage.getItem('payslip_token')}` },
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPayslips(data); else setError(data.error || 'Error'); })
      .catch(() => setError('Cannot connect to server'))
      .finally(() => setLoading(false));
  }, []);

  const downloadPdf = async (id, month, year) => {
    const res = await fetch(`/api/payslips/${id}/download`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('payslip_token')}` },
    });
    if (!res.ok) { alert('Download failed'); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `Payslip_${MONTHS[month]}_${year}.pdf`;
    document.body.appendChild(a); a.click();
    URL.revokeObjectURL(url); document.body.removeChild(a);
  };

  const logout = () => {
    localStorage.removeItem('payslip_token');
    localStorage.removeItem('payslip_role');
    localStorage.removeItem('employee_name');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div>
          <span className="text-base font-semibold text-slate-900">DinMind Payroll</span>
          <span className="ml-3 text-sm text-slate-500">Welcome, {name}</span>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut size={14} /> Logout
        </Button>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Your Payslips</h1>
            <p className="text-sm text-slate-500 mt-0.5">Download your monthly payslips below</p>
          </div>

          {/* AI Chat button */}
          <button
            onClick={() => setChatOpen(o => !o)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm"
          >
            <MessageSquare size={15} />
            Ask AI about my salary
          </button>
        </div>

        {/* AI info banner (shown once) */}
        {!chatOpen && (
          <div className="mb-4 flex items-start gap-3 p-3.5 rounded-xl bg-purple-50 border border-purple-200">
            <Sparkles size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-purple-800">
              <strong>New:</strong> Ask our AI any question about your salary — like "Why is my salary less this month?" or "How is PF calculated?"
            </p>
          </div>
        )}

        <Card>
          {loading && (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">Loading…</div>
          )}
          {error && (
            <div className="px-6 py-8 text-center text-red-600 text-sm">{error}</div>
          )}
          {!loading && !error && payslips.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">
              No payslips available yet. Contact HR for more information.
            </div>
          )}
          {!loading && payslips.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead className="text-right">Net Salary</TableHead>
                  <TableHead className="text-right">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-slate-900">{MONTHS[p.month]} {p.year}</TableCell>
                    <TableCell><Badge variant="secondary">{p.employee_id}</Badge></TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      ₹{Number(p.net_salary || p.salary || 0).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => downloadPdf(p.id, p.month, p.year)}>
                        <Download size={13} /> PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Floating AI Chat Panel */}
      {chatOpen && <AIChatPanel onClose={() => setChatOpen(false)} />}

      {/* Floating chat button (when panel is closed) */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 transition-all hover:scale-105 flex items-center justify-center"
          title="Ask AI about your salary"
        >
          <Sparkles size={22} />
        </button>
      )}
    </div>
  );
}
