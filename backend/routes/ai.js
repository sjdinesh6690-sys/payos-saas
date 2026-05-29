/**
 * routes/ai.js — PayLeef AI Features (powered by Google Gemini — Free Tier)
 *
 * POST /api/ai/employee-chat  → Employee Self-Service AI
 * POST /api/ai/anomaly-scan   → Smart Anomaly Detection (admin only)
 *
 * Requires: GEMINI_API_KEY in environment variables
 * Get free key at: https://aistudio.google.com
 */

const express  = require('express');
const router   = express.Router();
const { pool } = require('../database');
const authCheck = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const MONTHS = ['','January','February','March','April','May','June',
  'July','August','September','October','November','December'];

// Use latest stable model — gemini-2.0-flash is the current recommended free-tier model
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

function getGemini() {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI.getGenerativeModel({ model: GEMINI_MODEL });
  } catch (e) {
    console.error('[AI] Failed to init Gemini:', e.message);
    return null;
  }
}

// GET /api/ai/status — health check (no auth required for dashboard check)
router.get('/status', (req, res) => {
  const hasKey = !!(process.env.GEMINI_API_KEY);
  res.json({
    available: hasKey,
    provider:  hasKey ? 'Google Gemini' : null,
    model:     hasKey ? GEMINI_MODEL : null,
    message:   hasKey
      ? 'AI service is ready'
      : 'AI not configured. Add GEMINI_API_KEY in Render → Environment Variables → get free key at aistudio.google.com',
  });
});

router.use(authCheck);

// ── Employee Self-Service AI Chat ─────────────────────────────────────────────
// POST /api/ai/employee-chat
router.post('/employee-chat', async (req, res) => {
  try {
    if (!req.employee_db_id) {
      return res.status(403).json({ error: 'Employee access only' });
    }

    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Please enter a question' });
    }

    const model = getGemini();
    if (!model) {
      return res.status(503).json({ error: 'AI service not configured. Contact your admin.' });
    }

    // Fetch employee details
    const empResult = await pool.query(
      'SELECT * FROM employees WHERE id = $1 AND admin_id = $2',
      [req.employee_db_id, req.admin_id]
    );
    if (!empResult.rows.length) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const emp = empResult.rows[0];

    // Fetch last 6 months of payslips
    const payslipResult = await pool.query(
      `SELECT * FROM payslips
       WHERE admin_id = $1 AND employee_id = $2
       ORDER BY year DESC, month DESC LIMIT 6`,
      [req.admin_id, emp.employee_id]
    );
    const payslips = payslipResult.rows;

    // Build payslip summary
    let payslipContext = 'No payslips available yet.';
    if (payslips.length > 0) {
      payslipContext = payslips.map(p => {
        const earnings   = typeof p.earnings   === 'string' ? JSON.parse(p.earnings   || '{}') : (p.earnings   || {});
        const deductions = typeof p.deductions === 'string' ? JSON.parse(p.deductions || '{}') : (p.deductions || {});
        const earnList   = Object.entries(earnings).map(([k, v])   => `${k}: Rs.${Number(v).toLocaleString('en-IN')}`).join(', ');
        const dedList    = Object.entries(deductions).map(([k, v]) => `${k}: Rs.${Number(v).toLocaleString('en-IN')}`).join(', ');
        return `
${MONTHS[p.month]} ${p.year}:
  Gross: Rs.${Number(p.gross_salary).toLocaleString('en-IN')} | Net Take-home: Rs.${Number(p.net_salary).toLocaleString('en-IN')}
  Working Days: ${p.working_days} | Present: ${p.present_days} | LOP: ${p.lop_days} days
  Earnings: ${earnList || 'Not broken down'}
  Deductions: ${dedList || 'None recorded'}`;
      }).join('\n');
    }

    const prompt = `You are a friendly payroll assistant for PayLeef, a payroll software used by Indian companies.
You help employees understand their salary slip and payroll deductions in simple, clear language.

EMPLOYEE PROFILE:
  Name: ${emp.employee_name}
  Employee ID: ${emp.employee_id}
  Department: ${emp.department || 'Not specified'}
  Designation: ${emp.designation || 'Not specified'}
  Monthly CTC: Rs.${Number(emp.salary).toLocaleString('en-IN')}

RECENT PAYSLIP HISTORY:
${payslipContext}

RULES:
- Answer clearly and simply. Use plain English — not jargon.
- Always use Rs. symbol and Indian number format (e.g., Rs.45,000).
- If asked why salary changed: check LOP days or month-over-month differences.
- Explain deductions: PF = 12% of Basic, ESI applies if gross is Rs.21,000 or less (0.75%), Professional Tax = Rs.200/month.
- If you don't have the data to answer, say so and suggest contacting HR.
- Keep answers short — 2 to 4 sentences max.
- Do NOT make up numbers not in the payslip data.

Employee question: ${question.trim()}`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    res.json({ answer });

  } catch (err) {
    console.error('AI employee-chat error:', err.message);
    if (err.message?.includes('API_KEY') || err.message?.includes('API key')) {
      return res.status(503).json({ error: 'AI API key is invalid. Please contact your admin.' });
    }
    if (err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({ error: 'AI usage limit reached for today. Please try again tomorrow.' });
    }
    if (err.message?.includes('not found') || err.message?.includes('MODEL_NOT_FOUND')) {
      return res.status(503).json({ error: 'AI model unavailable. Please contact support.' });
    }
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again in a moment.' });
  }
});

// ── Smart Anomaly Detection ────────────────────────────────────────────────────
// POST /api/ai/anomaly-scan
router.post('/anomaly-scan', async (req, res) => {
  try {
    if (req.employee_db_id) {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const model = getGemini();
    if (!model) {
      return res.status(503).json({ error: 'AI service not configured. Add GEMINI_API_KEY in Render settings.' });
    }

    const m = parseInt(month);
    const y = parseInt(year);

    // Current month payslips
    const currentResult = await pool.query(
      `SELECT employee_id, employee_name, department,
              salary, gross_salary, net_salary,
              working_days, present_days, lop_days,
              total_earnings, total_deductions
       FROM payslips
       WHERE admin_id = $1 AND month = $2 AND year = $3
       ORDER BY employee_name ASC`,
      [req.admin_id, m, y]
    );

    if (!currentResult.rows.length) {
      return res.status(404).json({ error: `No payslips found for ${MONTHS[m]} ${y}` });
    }

    // Previous month for comparison
    const prevDate  = new Date(y, m - 2, 1);
    const prevMonth = prevDate.getMonth() + 1;
    const prevYear  = prevDate.getFullYear();

    const prevResult = await pool.query(
      `SELECT employee_id, employee_name, net_salary, gross_salary, lop_days, total_deductions
       FROM payslips
       WHERE admin_id = $1 AND month = $2 AND year = $3`,
      [req.admin_id, prevMonth, prevYear]
    );

    const currentData = currentResult.rows.map(p => ({
      employee_id:      p.employee_id,
      name:             p.employee_name,
      dept:             p.department,
      ctc:              Number(p.salary),
      gross:            Number(p.gross_salary),
      net:              Number(p.net_salary),
      lop_days:         Number(p.lop_days),
      working_days:     Number(p.working_days),
      present_days:     Number(p.present_days),
      total_deductions: Number(p.total_deductions),
    }));

    const prevMap = {};
    prevResult.rows.forEach(p => {
      prevMap[p.employee_id] = {
        net:              Number(p.net_salary),
        gross:            Number(p.gross_salary),
        lop_days:         Number(p.lop_days),
        total_deductions: Number(p.total_deductions),
      };
    });

    const prevEmployeeIds = Object.keys(prevMap);
    const currEmployeeIds = currentData.map(e => e.employee_id);
    const missingNow = prevEmployeeIds
      .filter(id => !currEmployeeIds.includes(id))
      .map(id => ({
        employee_id: id,
        name: prevResult.rows.find(r => r.employee_id === id)?.employee_name || id,
        prev_net: prevMap[id].net,
      }));

    const prompt = `You are a payroll auditor for an Indian company. Analyze the payroll data and find anomalies.

CURRENT MONTH: ${MONTHS[m]} ${y}
${JSON.stringify(currentData, null, 2)}

PREVIOUS MONTH (${MONTHS[prevMonth]} ${prevYear}):
${JSON.stringify(prevMap, null, 2)}

EMPLOYEES MISSING FROM CURRENT MONTH:
${JSON.stringify(missingNow, null, 2)}

CHECK FOR THESE ANOMALIES:
1. Net salary changed more than 20% vs previous month (not due to LOP)
2. LOP days is 3 or more (high absence)
3. Net salary is zero or negative
4. Total deductions is zero (every Indian employee must have PF and Professional Tax deductions)
5. Gross salary does not match CTC (should be within 5% if no LOP)
6. No previous month data (new employee — flag for verification)
7. Present in previous month but missing now (possible exit — verify)

Respond ONLY with a valid JSON array. No explanation. No markdown. No extra text.
Each item must have exactly these fields:
{
  "severity": "high" or "medium" or "low",
  "employee_id": "string",
  "employee_name": "string",
  "issue": "short title under 8 words",
  "detail": "one sentence with specific numbers"
}

If no anomalies found, return empty array: []`;

    const result = await model.generateContent(prompt);
    const raw    = result.response.text().trim();

    let anomalies = [];
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      anomalies   = match ? JSON.parse(match[0]) : [];
    } catch (e) {
      console.error('Anomaly JSON parse error:', e.message);
      anomalies = [];
    }

    res.json({
      scanned:      currentResult.rows.length,
      month:        m,
      year:         y,
      anomalies,
      compared_to:  `${MONTHS[prevMonth]} ${prevYear}`,
    });

  } catch (err) {
    console.error('AI anomaly-scan error:', err.message);
    if (err.message?.includes('API_KEY') || err.message?.includes('API key')) {
      return res.status(503).json({ error: 'AI API key is invalid. Check GEMINI_API_KEY in Render settings.' });
    }
    if (err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({ error: 'AI usage limit reached for today. Please try again tomorrow.' });
    }
    if (err.message?.includes('not found') || err.message?.includes('MODEL_NOT_FOUND')) {
      return res.status(503).json({ error: 'AI model unavailable. Please contact support.' });
    }
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again in a moment.' });
  }
});

// ── Page-context guidance (matches frontend PAGE_GUIDES) ─────────────────────
const PAGE_GUIDES_BACKEND = {
  '/admin/dashboard':      'Dashboard — shows overview, total employees, payslips sent this month, quick links.',
  '/admin/employees':      'Employees page — add, edit, search employees. Add Employee button top right. Pencil icon to edit.',
  '/admin/upload':         'Import Data — bulk upload employees via CSV. Download template first, fill it, then upload.',
  '/admin/send':           'Generate & Send — select month+year, click Generate, tick employees, click Send Email.',
  '/admin/payslips':       'Payslip History — view all past payslips, download PDF, resend email using icons on each row.',
  '/admin/reports':        'Reports — download PF Report, ESI Report, Bank Advice, Salary Register as Excel files.',
  '/admin/attendance':     'Attendance — mark P/A/H/CL/SL/EL for each employee per month. Affects LOP in payslips.',
  '/admin/payroll-config': 'Payroll Config — set Basic%, HRA%, allowances, and deductions (PF/ESI/PT/TDS). Save once.',
  '/admin/payroll-setup':  'Payroll Setup wizard — answer 9 questions, bot configures payroll automatically.',
  '/admin/leave-policy':   'Leave Policy — set CL/SL/EL days per year. Extra absences beyond balance = LOP.',
  '/admin/analytics':      'Analytics — payroll cost charts, department breakdown, headcount trends.',
  '/admin/form16':         'Form 16 — generate annual income tax certificate for employees, needed for their ITR filing.',
  '/admin/settings':       'Settings — update company name, logo, address, email settings, PDF password lock.',
  '/admin/billing':        'Billing — see current plan, upgrade to Monthly ₹999 or Annual ₹9,990.',
  '/admin/users':          'Users — add team members (HR, Accountant) with role-based access.',
  '/admin/locations':      'Locations — add office branches and assign employees to them.',
};

// ── Leef: built-in keyword FAQ (works with zero API calls, zero quota) ────────
const LEEF_FAQ = [
  {
    keys: ['add employee','add staff','add worker','new employee','create employee'],
    answer: `To add an employee 👤:\n1. Go to **Employees** in the left menu\n2. Click **Add Employee** (top right button)\n3. Fill in: Name, Employee ID, Email, Department, Monthly Salary\n4. Click **Save**\n\nThat's it! They'll appear in the list instantly. 😊`,
  },
  {
    keys: ['generate payslip','create payslip','make payslip','generate pay','run payroll'],
    answer: `To generate payslips ⚡:\n1. Go to **Generate & Send** in the left menu\n2. Select the **Month** and **Year**\n3. Click **Generate Payslips** — PayLeef calculates everything automatically\n4. Tick all employees → Click **Send Email**\n\nPayslips are sent to each employee's inbox instantly! 🎉`,
  },
  {
    keys: ['send payslip','email payslip','send email','email employee'],
    answer: `To send payslips by email 📧:\n1. Go to **Generate & Send**\n2. Generate payslips first (if not done)\n3. Tick the checkboxes next to all employees\n4. Click **Send Email**\n\nEach employee gets their payslip PDF in their inbox. ✅`,
  },
  {
    keys: ['download payslip','download pdf','get payslip'],
    answer: `To download a payslip as PDF ⬇️:\n1. Go to **Payslip History** in the left menu\n2. Filter by month if needed\n3. Click the **Download** icon on any employee row\n\nThe PDF saves to your computer's Downloads folder. 📂`,
  },
  {
    keys: ['import employee','bulk upload','upload csv','upload excel','import data','many employee','multiple employee'],
    answer: `To add many employees at once 📤:\n1. Go to **Import Data** in the left menu\n2. Click **Download Template** — opens an Excel file\n3. Fill in your employee details (don't change column headings!)\n4. Upload the file back\n\nPayLeef adds everyone in seconds! 🚀`,
  },
  {
    keys: ['pf','provident fund','epf','12%','pf deduction'],
    answer: `PF (Provident Fund) is a government retirement savings scheme 🏛️:\n\n• **Employee pays**: 12% of Basic Salary (deducted from salary)\n• **Employer also pays**: 12% of Basic Salary (company pays this separately — NOT from your salary)\n\nExample: Basic = ₹20,000 → You pay ₹2,400 PF per month. That money goes into your EPFO account — it's YOUR savings for the future! 💰`,
  },
  {
    keys: ['esi','employee state insurance','health insurance','esic'],
    answer: `ESI is a government health insurance scheme 🏥:\n\n• **Only applies** if your Gross Salary is ₹21,000 or less per month\n• Employee pays: 0.75% of Gross\n• Employer pays: 3.25% (extra, NOT from your salary)\n\nIf your salary is above ₹21,000 — ESI does NOT apply. No deduction. That's normal! ✅`,
  },
  {
    keys: ['lop','loss of pay','absent','salary deducted','salary less','salary cut','salary reduced','why less salary','why salary'],
    answer: `LOP (Loss of Pay) means salary is cut for absent days 📅:\n\nWhen you are absent beyond your leave balance, those extra days are "loss of pay".\n\n**Formula**: (Monthly Salary ÷ Working Days) × LOP Days = Amount deducted\n\nExample: Salary ₹30,000 ÷ 26 days × 2 LOP days = ₹2,308 deducted.\n\nCheck your attendance in the **Attendance** page to see your present/absent days. 😊`,
  },
  {
    keys: ['ctc','cost to company','total salary','annual salary'],
    answer: `CTC = Cost To Company 💰\n\nIt's the total amount the company spends on you per year, including salary + PF + all benefits.\n\n**Monthly salary = CTC ÷ 12**\n\nExample: CTC ₹6,00,000/year → Monthly = ₹50,000\n\nBut your **take-home** will be less than this because PF, PT and TDS are deducted. 😊`,
  },
  {
    keys: ['gross salary','gross pay','before deduction'],
    answer: `Gross Salary = Total earnings BEFORE any deductions 💵\n\nGross = Basic + HRA + Allowances\n\nExample: Basic ₹20,000 + HRA ₹8,000 + Allowances ₹5,000 = Gross ₹33,000\n\nAfter deducting PF, ESI, Professional Tax and TDS from Gross, you get your **Net Take-home** salary. 😊`,
  },
  {
    keys: ['net salary','take home','in hand','actual salary','bank account'],
    answer: `Net Salary = Money that lands in your bank account 🏦\n\nNet = Gross Salary − All Deductions (PF + ESI + Professional Tax + TDS)\n\nExample:\nGross: ₹33,000\n− PF: ₹2,400\n− PT: ₹200\n= **Net Take-home: ₹30,400**\n\nYour payslip shows the full breakdown. Download it from **Payslip History**. 😊`,
  },
  {
    keys: ['tds','income tax','tax deducted','it deduction'],
    answer: `TDS = Tax Deducted at Source 📉\n\nIt's the income tax deducted every month from your salary.\n\n• Based on your annual income and tax slab\n• Calculated at year start, divided by 12 months\n• Goes directly to the Income Tax Department\n\nIf you submit tax savings proofs (80C investments, rent receipts), your TDS reduces. Ask your HR to update your tax declarations. 😊`,
  },
  {
    keys: ['professional tax','pt deduction','state tax'],
    answer: `Professional Tax (PT) is a small state government tax 🗺️\n\nIt's deducted every month from your salary:\n• Maharashtra, Karnataka: ₹200/month\n• Tamil Nadu: ~₹208/month\n• Varies slightly by state\n\nIt's mandatory. Goes to your state government. Nothing to worry about — it's a very small amount! 😊`,
  },
  {
    keys: ['payroll config','configure payroll','setup payroll','salary structure','basic percentage','hra percentage'],
    answer: `To configure payroll settings ⚙️:\n1. Go to **Setup → Payroll Config** in the left menu\n2. Set your salary structure:\n   • Basic: 40% of CTC (recommended)\n   • HRA: 40% of Basic\n   • Special Allowance: remaining amount\n3. Set deductions: PF (12%), ESI, PT, TDS\n4. Upload your company logo\n5. Click **Save Config**\n\nDo this once — PayLeef uses these settings for all future payslips automatically! 🎉`,
  },
  {
    keys: ['attendance','mark attendance','present absent','half day'],
    answer: `To mark attendance 📅:\n1. Go to **Attendance** in the left menu\n2. Select the month\n3. For each employee, mark: Present / Absent / Half Day\n4. Also enter leave type: CL (Casual), SL (Sick), EL (Earned)\n\nPayLeef automatically calculates LOP (loss of pay) based on absences beyond leave balance. This pulls into payslip generation automatically. 😊`,
  },
  {
    keys: ['leave policy','cl','sl','el','casual leave','sick leave','earned leave','leave balance'],
    answer: `Leave Policy sets how many leaves employees get per year 📋\n\nGo to **Setup → Leave Policy** to configure:\n• CL (Casual Leave): usually 12 days/year\n• SL (Sick Leave): usually 12 days/year\n• EL (Earned Leave): usually 15 days/year\n\nPayLeef tracks each employee's leave balance automatically as they take leaves. When balance runs out, extra absences become LOP. 😊`,
  },
  {
    keys: ['pf report','esi report','bank advice','salary register','compliance report','statutory report','download report'],
    answer: `To download compliance reports 📊:\n1. Go to **Reports** in the left menu\n2. Select the Month and Year\n3. Click Download next to the report you need:\n   • **PF Report** — for EPFO submission\n   • **ESI Report** — for ESIC submission\n   • **Bank Advice** — send to your bank for salary transfers\n   • **Salary Register** — full month summary\n\nAll reports are in Excel format, government-ready! ✅`,
  },
  {
    keys: ['form 16','income tax certificate','annual certificate','tax certificate'],
    answer: `Form 16 Part B is an annual income tax certificate 📝\n\nGenerate it once a year (usually in April):\n1. Go to **Form 16** in the left menu\n2. Select the financial year\n3. Click Generate for each employee\n4. Download the PDF and give it to employees\n\nEmployees use this to file their Income Tax Return (ITR). 😊`,
  },
  {
    keys: ['billing','plan','subscription','upgrade','payment','trial'],
    answer: `To manage your subscription 💳:\n1. Go to **Setup → Billing & Plan** in the left menu\n2. See your current plan and days remaining\n3. Click **Upgrade** to switch to a paid plan\n\nPayLeef offers:\n• Monthly Plan: ₹999/month\n• Annual Plan: ₹9,990/year (save 2 months!)\n\nContact support if you need help with billing. 😊`,
  },
  {
    keys: ['payslip not sent','email not received','payslip not received','not getting email'],
    answer: `If a payslip email was not received 📧:\n\n1. Check the employee has a valid email saved — go to **Employees** and verify\n2. Ask them to check their **Spam/Junk folder**\n3. Go to **Payslip History** → click the **Resend** icon next to that employee\n\nIf still not working, check your email settings in **Settings** page. 😊`,
  },
  {
    keys: ['hello','hi','hey','helo','hii','good morning','good afternoon','namaste'],
    answer: `Hi there! 👋 I'm Leef 🌿 — your PayLeef helper!\n\nI can answer questions about:\n• How to use PayLeef (add employees, generate payslips, download reports)\n• Indian payroll concepts (PF, ESI, LOP, TDS, CTC)\n\nJust ask me anything — I'm here to help! 😊`,
  },
  {
    keys: ['thank','thanks','thank you','great','perfect','helpful','awesome'],
    answer: `You're welcome! 😊🌿\n\nFeel free to ask me anything else about PayLeef or payroll. I'm always here to help! 🚀`,
  },
];

// Match question to FAQ — returns answer string or null
function findFaqAnswer(question) {
  const q = question.toLowerCase().trim();
  for (const faq of LEEF_FAQ) {
    if (faq.keys.some(k => q.includes(k))) {
      return faq.answer;
    }
  }
  return null;
}

// ── Leef system instruction for Gemini (used only when AI is available) ──────
const LEEF_SYSTEM = `You are Leef, the friendly helper for PayLeef payroll software for Indian businesses. Talk simply like a kind friend. Use emojis. Keep answers short (3-5 sentences) unless user asks for steps. Use ₹ for rupees. Be encouraging. Never discuss other payroll software.

PayLeef pages: HOME (overview+steps), EMPLOYEES (add/edit/delete/search), IMPORT DATA (bulk CSV upload), GENERATE & SEND (select month→generate→send email), PAYSLIP HISTORY (view/download/resend), REPORTS (PF/ESI/Bank Advice/Salary Register Excel), ANALYTICS (charts), PAYROLL CONFIG (Basic 40%, HRA 40% of Basic, PF 12%, ESI 0.75% if gross≤21000, PT, TDS), ATTENDANCE (mark present/absent/CL/SL/EL), FORM 16 (annual tax cert), LEAVE POLICY (CL/SL/EL days), BILLING (plans), SETTINGS (company/email/PDF password).

Payroll: CTC=annual cost÷12=monthly. Gross=Basic+HRA+allowances. Net=Gross−deductions. PF=12% of Basic (employee), employer also 12% separate. ESI=0.75% only if gross≤₹21000. PT=~₹200/month state tax. TDS=monthly income tax. LOP=salary÷working days×absent days beyond leave.`;

// ── Leef — PayLeef Help Bot ───────────────────────────────────────────────────
// POST /api/ai/help-bot
router.post('/help-bot', async (req, res) => {
  try {
    const { message, history = [], currentPage = '', pageTitle = '' } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ answer: 'Please type your question!' });
    }

    const q = message.trim();

    // ── Step 1: Try built-in FAQ first (instant, zero API calls) ──────────────
    const faqAnswer = findFaqAnswer(q);
    if (faqAnswer) {
      return res.json({ answer: faqAnswer });
    }

    // ── Step 2: Try Gemini for complex/custom questions ───────────────────────
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        answer: `I can answer many common PayLeef questions! 😊\n\nTry asking:\n• "How do I add employees?"\n• "What is PF deduction?"\n• "How do I generate payslips?"\n• "What is LOP?" 🌿`,
      });
    }

    // Build system instruction — include current page context if available
    const pageContext = PAGE_GUIDES_BACKEND[currentPage]
      ? `\n\nUSER IS CURRENTLY ON: ${PAGE_GUIDES_BACKEND[currentPage]}`
      : '';

    const systemWithContext = LEEF_SYSTEM + pageContext;

    try {
      const genAI = new (require('@google/generative-ai').GoogleGenerativeAI)(process.env.GEMINI_API_KEY);
      const leefModel = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: systemWithContext,
      });

      // Keep only last 4 messages to minimise tokens
      const chatHistory = history
        .slice(-4)
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));

      const chat = leefModel.startChat({ history: chatHistory });
      const result = await chat.sendMessage(q);
      return res.json({ answer: result.response.text() });

    } catch (aiErr) {
      console.error('[HelpBot] Gemini error:', aiErr.message);
      return res.json({
        answer: `I couldn't reach my AI brain right now 😅 but I can still help!\n\nTry asking:\n• "How do I add employees?"\n• "What is PF?"\n• "How to generate payslips?"\n• "What is LOP?" 🌿`,
      });
    }

  } catch (err) {
    console.error('[HelpBot] error:', err.message);
    res.json({ answer: "Oops, something went wrong! 😅 Please try again in a moment. 🌿" });
  }
});

module.exports = router;
