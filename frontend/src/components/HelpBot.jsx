/**
 * HelpBot — "Leef" the PayLeef AI Help Assistant
 * Floating chat widget available on all admin pages.
 * - Auto-shows page guide when opened on any known page
 * - Powered by Google Gemini via /api/ai/help-bot
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, X, ChevronDown, RotateCcw, BookOpen } from 'lucide-react';
import api from '@/lib/api';

const G = '#1A7A4A';

// ── Page-specific guides ─────────────────────────────────────────────────────
// Shown automatically when the bot is opened on that page.
const PAGE_GUIDES = {
  '/admin/dashboard': {
    title: 'Dashboard',
    emoji: '🏠',
    guide: `This is your **home page**. Here you can see:
• Total employees in your company
• How many payslips were sent this month
• Quick links to common tasks

👉 **What to do first:**
1. Click **Employees** to add your staff
2. Click **Payroll Config** to set up salary rules
3. Then go to **Generate & Send** to run payroll`,
  },

  '/admin/employees': {
    title: 'Employees Page',
    emoji: '👥',
    guide: `This page shows all your employees. Here's how to use it:

**➕ To add one employee:**
1. Click the green **Add Employee** button (top right)
2. Fill in: Name, Employee ID, Email, Salary
3. Click **Save** — done!

**📤 To add many employees at once:**
Go to **Import Data** in the left menu and upload a CSV file.

**✏️ To edit an employee:**
Click the pencil ✏️ icon next to their name.

**🔍 To search:**
Type a name or ID in the search box at the top.`,
  },

  '/admin/upload': {
    title: 'Import Data Page',
    emoji: '📤',
    guide: `This page lets you add many employees at once using a file. Here's how:

**Step 1:** Click **Download Template**
→ This gives you an Excel/CSV file with the right columns.

**Step 2:** Open the file and fill in your employee details
→ Don't change the column headings! Just fill in the rows.

**Step 3:** Save the file, then come back here and upload it
→ Click **Choose File**, select your file, click **Upload**

PayLeef will add all employees in seconds! 🚀`,
  },

  '/admin/send': {
    title: 'Generate & Send Page',
    emoji: '⚡',
    guide: `This is where you run payroll and send payslips. Here's how:

**Step 1:** Select the **Month** and **Year** at the top

**Step 2:** Click **Generate Payslips**
→ PayLeef calculates salary for all employees automatically

**Step 3:** Tick the checkboxes next to employees you want to send to
→ Use **Select All** to tick everyone at once

**Step 4:** Click **Send Email**
→ Every employee gets their payslip PDF in their email inbox!

💡 *You can also download individual PDFs before sending.*`,
  },

  '/admin/payslips': {
    title: 'Payslip History Page',
    emoji: '📄',
    guide: `This page shows all payslips ever generated. Here's how to use it:

**🔍 To find a payslip:**
→ Filter by employee name or month using the dropdowns at the top

**⬇️ To download a payslip PDF:**
→ Click the **Download** icon on any row

**📧 To resend a payslip by email:**
→ Click the **Email** icon on any row

**👁️ To preview a payslip:**
→ Click the **eye** icon to see it on screen`,
  },

  '/admin/reports': {
    title: 'Reports Page',
    emoji: '📊',
    guide: `This page has official reports for your company. Here's what each one is:

**PF Report** → Send this to EPFO every month (provident fund)
**ESI Report** → Send this to ESIC every month (health insurance)
**Bank Advice** → Give this to your bank to transfer salaries
**Salary Register** → Full list of all employee salaries for the month

**How to download:**
1. Select the **Month** and **Year**
2. Click the **Download** button next to the report you need
→ It downloads as an Excel file, ready to submit! ✅`,
  },

  '/admin/attendance': {
    title: 'Attendance Page',
    emoji: '📅',
    guide: `This page tracks who came to work each day. Here's how to use it:

**Step 1:** Select the **Month** at the top

**Step 2:** For each employee, mark their days:
• **P** = Present ✅
• **A** = Absent ❌
• **H** = Half Day 🌓
• **CL** = Casual Leave
• **SL** = Sick Leave
• **EL** = Earned Leave

**Step 3:** Click **Save**

💡 *When you generate payslips, PayLeef automatically uses this attendance to calculate LOP (loss of pay) for absent days.*`,
  },

  '/admin/payroll-config': {
    title: 'Payroll Config Page',
    emoji: '⚙️',
    guide: `This page controls how salary is calculated. Set this up once and PayLeef uses it every month.

**Salary Structure tab:**
• Basic Salary: usually 40% of total salary
• HRA: usually 40% of Basic
• Conveyance: ₹1,600/month (standard)
• Special Allowance: the remaining amount (auto-calculated)

**Deductions tab:**
• PF: 12% of Basic (tick if you want it deducted)
• ESI: 0.75% of Gross (only for salaries ≤ ₹21,000)
• Professional Tax: ~₹200/month (depends on your state)
• TDS: income tax (auto-calculated)

**After making changes:** Click **Save Config** ✅`,
  },

  '/admin/payroll-setup': {
    title: 'Payroll Setup (Auto)',
    emoji: '🤖',
    guide: `This is the **automatic setup wizard**. It asks you simple questions and sets up your payroll for you.

**How it works:**
1. Answer each question — just click the option that fits you
2. The bot asks about: your state, employee count, salary structure, and deductions
3. At the end, click **Apply Configuration**
4. Your entire payroll is set up automatically!

💡 *If you exit and come back, it will resume from where you left off.*

This is the fastest way to get started. No manual setup needed! 🚀`,
  },

  '/admin/leave-policy': {
    title: 'Leave Policy Page',
    emoji: '🌴',
    guide: `This page sets how many leave days employees get per year.

**Types of leave:**
• **CL (Casual Leave):** For personal work. Usually 12 days/year.
• **SL (Sick Leave):** When unwell. Usually 12 days/year.
• **EL (Earned Leave):** Builds up over time. Usually 15 days/year.

**How to update:**
1. Change the numbers for each leave type
2. Click **Save**

💡 *If an employee takes more days than their leave balance, the extra days become LOP (Loss of Pay) and salary is deducted automatically.*`,
  },

  '/admin/analytics': {
    title: 'Analytics Page',
    emoji: '📈',
    guide: `This page shows charts and graphs about your payroll.

**What you can see:**
• Monthly payroll cost over time
• Department-wise salary breakdown
• Headcount changes
• PF and ESI contribution trends

**How to use:**
→ Use the filters at the top to change the time period
→ Hover over any chart bar or line to see exact numbers
→ Use the charts in your management reports or salary reviews 😊`,
  },

  '/admin/form16': {
    title: 'Form 16 Page',
    emoji: '📝',
    guide: `Form 16 is an annual income tax certificate you give to employees.

**When to use:** Once a year, usually in April or May after the financial year ends.

**How to generate:**
1. Select the **Financial Year** (e.g. 2024–25)
2. Click **Generate** next to each employee
3. Download the PDF and give it to them

**What employees use it for:**
→ To file their Income Tax Return (ITR) with the government 😊`,
  },

  '/admin/settings': {
    title: 'Settings Page',
    emoji: '🔧',
    guide: `This page has important settings for your company. Here's what each section does:

**Company Profile:**
→ Update your company name, logo, address, phone, email
→ This info appears on every payslip you generate

**Email Settings:**
→ Set up how PayLeef sends payslip emails to employees

**PDF Settings:**
→ Turn on/off password lock for payslip PDFs
→ If on, employees open their PDF using their Employee ID

**After making changes:** Always click **Save** at the bottom ✅`,
  },

  '/admin/billing': {
    title: 'Billing & Plan Page',
    emoji: '💳',
    guide: `This page shows your current subscription plan.

**What you can see:**
• Your current plan (Free Trial or Paid)
• How many days are left in your trial or billing period
• Number of employees on your plan

**To upgrade:**
1. Click **Upgrade Plan**
2. Choose Monthly (₹999/month) or Annual (₹9,990/year)
3. Complete the payment

💡 *Annual plan saves you 2 months' cost compared to monthly!*

Contact us if you have any billing questions. 😊`,
  },

  '/admin/users': {
    title: 'Users Page',
    emoji: '👤',
    guide: `This page lets you add other team members who can log in to PayLeef.

**How to add a user:**
1. Click **Add User**
2. Enter their name, email and set their role:
   • **Admin:** Can do everything
   • **HR:** Can manage employees and payslips
   • **Viewer:** Can only view, cannot make changes
3. They will receive an email to set their password

💡 *Good for giving your accountant or HR manager access without sharing your main login.*`,
  },

  '/admin/locations': {
    title: 'Locations Page',
    emoji: '📍',
    guide: `This page lets you manage different office locations or branches.

**How to add a location:**
1. Click **Add Location**
2. Enter the location name (e.g. "Chennai Office", "Mumbai Branch")
3. Click **Save**

**What it's used for:**
→ You can assign employees to different locations
→ Useful if you have employees in different cities or states
→ Helps organise your employee list by location 😊`,
  },
};

// ── Suggested questions (shown on welcome screen) ────────────────────────────
const SUGGESTIONS = [
  '📖 How do I use this page?',
  '👤 How do I add employees?',
  '⚡ How do I generate payslips?',
  '📅 What is LOP and how is it calculated?',
  '🏛️ What is PF deduction?',
  '📊 How do I download PF or ESI report?',
  '💰 What is the difference between CTC and take-home?',
  '📧 How to send payslips by email?',
];

// ── Leaf + chat icon for the floating button ─────────────────────────────────
const LeafChatIcon = () => (
  <svg viewBox="0 0 36 36" fill="none" width="36" height="36">
    <path d="M18 4C24 4 30 10 29 18C28 26 24 31 18 32C12 31 8 26 7 18C6 10 12 4 18 4Z" fill="white" opacity="0.95"/>
    <line x1="18" y1="5" x2="18" y2="31" stroke={G} strokeWidth="2" strokeLinecap="round"/>
    <line x1="11" y1="13" x2="25" y2="13" stroke={G} strokeWidth="2" strokeLinecap="round"/>
    <line x1="11" y1="18" x2="25" y2="18" stroke={G} strokeWidth="2" strokeLinecap="round"/>
    <line x1="11" y1="18" x2="22" y2="29" stroke={G} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="27" cy="9" r="8" fill="#22C55E"/>
    <circle cx="24.5" cy="9" r="1.3" fill="white"/>
    <circle cx="27" cy="9" r="1.3" fill="white"/>
    <circle cx="29.5" cy="9" r="1.3" fill="white"/>
  </svg>
);

const LeefAvatar = ({ size = 28 }) => (
  <div
    className="flex items-center justify-center rounded-full shrink-0 font-bold text-white"
    style={{ width: size, height: size, background: `linear-gradient(135deg, ${G} 0%, #22C55E 100%)`, fontSize: size * 0.4 }}
  >
    🌿
  </div>
);

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <LeefAvatar />
      <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-sm" style={{ background: '#F1F5F9', maxWidth: 80 }}>
        {[0, 1, 2].map(i => (
          <span key={i} className="w-2 h-2 rounded-full"
            style={{ background: '#94A3B8', animation: 'leef-bounce 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Render message text with **bold** support and line breaks ─────────────────
function renderText(text) {
  return text.split('\n').map((line, i, arr) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
        {i < arr.length - 1 && <br />}
      </span>
    );
  });
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-end gap-2 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && <LeefAvatar />}
      <div
        className="px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed"
        style={{
          maxWidth: '82%',
          background: isUser ? G : '#F1F5F9',
          color: isUser ? '#fff' : '#1E293B',
          borderBottomRightRadius: isUser ? 4 : undefined,
          borderBottomLeftRadius: !isUser ? 4 : undefined,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {renderText(msg.content)}
      </div>
    </div>
  );
}

// ── Main HelpBot component ───────────────────────────────────────────────────
export default function HelpBot() {
  const location = useLocation();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [pulse, setPulse]       = useState(true);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Get current page guide
  const currentPath  = location.pathname;
  const pageGuide    = PAGE_GUIDES[currentPath];

  // Stop pulsing after 8 seconds
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 8000);
    return () => clearTimeout(t);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  // When bot opens: show page guide if available, otherwise generic welcome
  const handleOpen = () => {
    setOpen(v => {
      const opening = !v;
      if (opening && messages.length === 0) {
        if (pageGuide) {
          // Auto-show page guide
          setMessages([{
            role: 'assistant',
            content: `${pageGuide.emoji} **${pageGuide.title}** — Here's how to use this page:\n\n${pageGuide.guide}`,
          }]);
        }
      }
      return opening;
    });
    setPulse(false);
  };

  // Reset when page changes — show fresh guide for new page
  useEffect(() => {
    if (open) {
      setMessages([]);
      setInput('');
      if (pageGuide) {
        setMessages([{
          role: 'assistant',
          content: `${pageGuide.emoji} **${pageGuide.title}** — Here's how to use this page:\n\n${pageGuide.guide}`,
        }]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const sendMessage = useCallback(async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;

    // Special handling for "How do I use this page?"
    if (question.toLowerCase().includes('how do i use this page') || question.toLowerCase().includes('use this page')) {
      if (pageGuide) {
        const pageMsg = { role: 'assistant', content: `${pageGuide.emoji} **${pageGuide.title}** — Here's how to use this page:\n\n${pageGuide.guide}` };
        setMessages(prev => [...prev, { role: 'user', content: question }, pageMsg]);
        setInput('');
        return;
      }
    }

    const userMsg = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      // Pass current page to backend for better context
      const { data } = await api.post('/ai/help-bot', {
        message: question,
        history,
        currentPage: currentPath,
        pageTitle: pageGuide?.title || '',
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer || "I'm not sure about that! Try asking your HR team. 😊",
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Oops, I had a hiccup! 😅 Please try again in a moment.",
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, messages, loading, currentPath, pageGuide]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const resetChat = () => {
    setMessages(pageGuide ? [{
      role: 'assistant',
      content: `${pageGuide.emoji} **${pageGuide.title}** — Here's how to use this page:\n\n${pageGuide.guide}`,
    }] : []);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const showWelcome = messages.length === 0;

  return (
    <>
      <style>{`
        @keyframes leef-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-5px); opacity: 1; } }
        @keyframes leef-pulse { 0% { box-shadow: 0 0 0 0 rgba(26,122,74,0.5); } 70% { box-shadow: 0 0 0 14px rgba(26,122,74,0); } 100% { box-shadow: 0 0 0 0 rgba(26,122,74,0); } }
        @keyframes leef-slide-up { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .leef-chat-window { animation: leef-slide-up 0.2s ease-out; }
      `}</style>

      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>

        {/* Chat window */}
        {open && (
          <div className="leef-chat-window" style={{ width: 370, height: 540, background: '#fff', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.08)' }}>

            {/* Header */}
            <div style={{ background: `linear-gradient(135deg, ${G} 0%, #22C55E 100%)`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌿</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>Leef — PayLeef Helper</p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>
                  🟢 Online{pageGuide ? ` · ${pageGuide.emoji} ${pageGuide.title}` : ' · Ask me anything'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={resetChat} title="Start new chat"
                  style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <RotateCcw size={14} />
                </button>
                <button onClick={() => setOpen(false)}
                  style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>

            {/* Chat area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px', background: '#FAFBFC' }}>

              {/* Welcome state */}
              {showWelcome && (
                <div style={{ marginBottom: 16 }}>
                  <div className="flex items-end gap-2 mb-3">
                    <LeefAvatar />
                    <div style={{ background: '#F1F5F9', borderRadius: '16px 16px 16px 4px', padding: '12px 14px', maxWidth: '85%' }}>
                      <p style={{ margin: 0, fontSize: 13, color: '#1E293B', lineHeight: 1.6 }}>
                        👋 Hi! I'm <strong>Leef</strong> — your PayLeef helper!
                      </p>
                      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                        Ask me anything about PayLeef or click a question below. 😊
                      </p>
                    </div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px 2px' }}>
                      {pageGuide ? `📖 Page guide + common questions` : 'Common questions'}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {/* Page guide button shown first if on a known page */}
                      {pageGuide && (
                        <button
                          onClick={() => sendMessage(`How do I use this page?`)}
                          style={{ textAlign: 'left', background: '#F0FDF4', border: `1.5px solid ${G}`, borderRadius: 10, padding: '8px 12px', fontSize: 12.5, color: G, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <BookOpen size={13} /> {pageGuide.emoji} How to use {pageGuide.title}
                        </button>
                      )}
                      {SUGGESTIONS.filter(q => !q.includes('use this page')).map((q, i) => (
                        <button key={i} onClick={() => sendMessage(q.replace(/^[^\s]+ /, ''))}
                          style={{ textAlign: 'left', background: '#fff', border: `1.5px solid #E2E8F0`, borderRadius: 10, padding: '8px 12px', fontSize: 12.5, color: '#334155', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.color = G; e.currentTarget.style.background = '#F0FDF4'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#334155'; e.currentTarget.style.background = '#fff'; }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

              {/* Typing indicator */}
              {loading && <TypingIndicator />}

              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid #F1F5F9', background: '#fff', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about PayLeef..."
                rows={1}
                disabled={loading}
                style={{ flex: 1, resize: 'none', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', color: '#1E293B', outline: 'none', lineHeight: 1.5, maxHeight: 100, overflow: 'auto', background: input.length > 0 ? '#fff' : '#FAFBFC', transition: 'border-color 0.15s' }}
                onFocus={e => { e.target.style.borderColor = G; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                style={{ width: 38, height: 38, borderRadius: 12, background: input.trim() && !loading ? G : '#E2E8F0', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}
              >
                <Send size={15} color={input.trim() && !loading ? '#fff' : '#94A3B8'} />
              </button>
            </div>

            {/* Footer */}
            <div style={{ padding: '6px 12px 10px', background: '#fff', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 10.5, color: '#CBD5E1' }}>Powered by AI · Enter to send · Esc to close</p>
            </div>
          </div>
        )}

        {/* Floating button */}
        <button
          onClick={handleOpen}
          title="Ask Leef — PayLeef Helper"
          style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${G} 0%, #22C55E 100%)`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: open ? `0 4px 24px rgba(26,122,74,0.4)` : `0 4px 20px rgba(26,122,74,0.35)`, transition: 'all 0.2s', animation: pulse && !open ? 'leef-pulse 2s ease-out infinite' : 'none', position: 'relative' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {open ? <X size={22} color="white" /> : <LeafChatIcon />}

          {!open && pulse && (
            <span style={{ position: 'absolute', top: 4, right: 4, width: 10, height: 10, background: '#EF4444', borderRadius: '50%', border: '2px solid white' }} />
          )}
        </button>

        {/* Tooltip */}
        {!open && pulse && (
          <div style={{ position: 'absolute', bottom: 64, right: 0, background: '#0F172A', color: 'white', padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', pointerEvents: 'none' }}>
            {pageGuide ? `📖 Click to see how to use ${pageGuide.title}` : '💬 Hi! I\'m Leef — ask me anything!'}
            <div style={{ position: 'absolute', bottom: -5, right: 20, width: 10, height: 10, background: '#0F172A', transform: 'rotate(45deg)' }} />
          </div>
        )}
      </div>
    </>
  );
}
