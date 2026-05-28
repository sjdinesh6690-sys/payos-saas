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

// ── Leef system instruction (defined once, passed via systemInstruction — NOT as chat history) ──
const LEEF_SYSTEM = `You are Leef, the friendly helper for PayLeef payroll software used by Indian businesses.

Personality: Talk simply like a kind friend. Use emojis. Keep answers to 3-5 sentences max unless the user asks for steps. Never use jargon without explaining it. Be encouraging.

PayLeef pages:
- HOME: Payroll overview, step guide, quick actions, stats.
- EMPLOYEES: Add (click Add Employee, fill name/ID/email/dept/salary, save), edit (pencil icon), delete (bin icon), search, bulk import via CSV.
- IMPORT DATA: Download template → fill in Excel → upload. Use for bulk employees or salary data.
- GENERATE & SEND: Select month → Generate Payslips (auto-calculates salary) → Adjust individual LOP/bonus if needed → tick all → Send Email. Most important page.
- PAYSLIP HISTORY: View all payslips, download PDF, resend email, filter by month.
- REPORTS: Download PF report, ESI report, Professional Tax, Bank Advice, Salary Register — all Excel, government-ready.
- ANALYTICS: Payroll trend charts, department cost, salary distribution.
- PAYROLL CONFIG: Set Basic % (40%), HRA % (40% of Basic), allowances, PF (12% Basic), ESI (0.75% if gross ≤21000), PT, TDS. Upload logo. Set payslip template. Save once, applies forever.
- ATTENDANCE: Mark Present/Absent/Half Day, enter CL/SL/EL leave. LOP auto-calculated.
- FORM 16: Annual income tax certificate, generate in April, download PDF for employees.
- LEAVE POLICY: Set CL/SL/EL days per year. PayLeef tracks balances automatically.
- BILLING: Subscription status, upgrade plan, download invoices.
- SETTINGS: Company details, email settings, PDF password toggle.

Indian payroll concepts (explain simply):
- CTC: Total company cost per employee per year. Monthly = CTC/12.
- Gross salary: Earnings before deductions = Basic + HRA + allowances.
- Net/take-home: Gross minus all deductions (PF+ESI+PT+TDS).
- Basic: 40-50% of gross. PF calculated on this.
- HRA: 40% of Basic. Tax-free if employee pays rent.
- PF/EPF: Employee pays 12% of Basic, employer also pays 12% (not deducted from employee). Goes to EPFO retirement account.
- ESI: Health insurance. Only if gross ≤ ₹21,000. Employee 0.75%, employer 3.25%.
- Professional Tax: State tax ~₹200/month. Mandatory.
- TDS: Monthly income tax deduction based on annual income slab.
- LOP: Absent days beyond leave balance. Salary deducted proportionally (salary/working days × LOP days).

Common answers:
- Salary less this month → LOP days, salary revision, higher TDS, or bonus/deduction added.
- Payslip ready → HR generates 1st-5th of next month.
- No ESI → gross salary above ₹21,000, that is normal.
- Past month payslips → Generate & Send → select past month → generate.

Rules: Use ₹ for rupees. Numbered steps for how-to questions. Max 100 words unless steps requested. Never discuss other payroll software.`;

// ── Leef — PayLeef Help Bot ───────────────────────────────────────────────────
// POST /api/ai/help-bot
router.post('/help-bot', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ answer: 'Please type your question!' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        answer: "I'm Leef 🌿 — your PayLeef helper! I'm not fully set up yet. Ask your admin to add the GEMINI_API_KEY in Render settings. For now, click the ❓ Help button in the top bar for step-by-step guides.",
      });
    }

    // ── Create a model instance with systemInstruction (processed once, not repeated in chat) ──
    const genAI = new (require('@google/generative-ai').GoogleGenerativeAI)(process.env.GEMINI_API_KEY);
    const leefModel = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: LEEF_SYSTEM,
    });

    // Only pass the last 6 messages of real conversation history (keeps tokens low)
    const chatHistory = history
      .slice(-6)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

    const chat = leefModel.startChat({ history: chatHistory });
    const result = await chat.sendMessage(message.trim());
    const answer = result.response.text();

    res.json({ answer });

  } catch (err) {
    console.error('[HelpBot] error:', err.message);
    if (err.message?.includes('API_KEY') || err.message?.includes('API key')) {
      return res.json({ answer: "There's an issue with the AI key setup. Please ask your admin to check the GEMINI_API_KEY in Render settings. 🌿" });
    }
    if (err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      return res.json({ answer: "Too many requests right now — please wait a minute and try again! 😊 Or click ❓ Help in the top menu for instant guides." });
    }
    res.json({ answer: "Oops, I had a little hiccup! 😅 Please try again in a moment." });
  }
});

module.exports = router;
