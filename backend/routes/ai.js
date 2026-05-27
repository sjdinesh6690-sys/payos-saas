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

// ── Leef — PayLeef Help Bot ───────────────────────────────────────────────────
// POST /api/ai/help-bot
// Conversational assistant that helps users understand PayLeef + Indian payroll
// req.body: { message: string, history: [{role:'user'|'assistant', content:string}] }
router.post('/help-bot', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ answer: 'Please type your question!' });
    }

    const model = getGemini();
    if (!model) {
      return res.json({
        answer: "I'm Leef 🌿 — your PayLeef helper! I'm not fully set up yet. Ask your admin to add the AI key in settings. For now, try clicking the ❓ Help button in the top bar for step-by-step guides.",
      });
    }

    // ── System knowledge base — everything Leef knows ──
    const SYSTEM_KNOWLEDGE = `
You are Leef 🌿, the super-friendly help assistant for PayLeef — payroll software for Indian businesses.

YOUR PERSONALITY:
- Talk like a kind, patient friend — very simple words
- Use emojis to make it fun and easy to read 😊
- NEVER use confusing jargon without immediately explaining it in brackets
- Keep answers SHORT — 3 to 5 sentences max unless the user asks for steps
- Always be encouraging. Never make anyone feel stupid for asking
- If something is outside your knowledge, say "I'm not sure about that, but ask your HR or admin! 😊"

PAYLEEF SOFTWARE — WHAT EACH PAGE DOES:

🏠 HOME (the main page after login):
- Shows your company payroll overview
- Step-by-step guide showing exactly what to do to process payroll
- Quick buttons to jump to any task
- Stats: total employees, this month's payroll total, payslips sent

👥 EMPLOYEES page:
- See list of all your employees
- Add a new employee: Click "Add Employee" → fill name, employee ID, email, department, salary → Save
- Edit an employee: Click the pencil/edit icon next to their name
- Delete an employee: Click the bin/trash icon (their old payslips stay safe)
- Search: type in the search box to find anyone instantly
- You can also upload many employees at once using a CSV/Excel file

📤 IMPORT DATA (also called Upload):
- Add many employees at once — instead of adding one by one
- Step 1: Click "Download Template" — opens an Excel file
- Step 2: Fill employee details in the Excel file (don't change column headings!)
- Step 3: Upload the file back — PayLeef reads it and adds everyone
- Also use this to upload salary data for a specific month

⚡ GENERATE & SEND (the most important page!):
- This is where you create payslips and send them to employees
- Step 1: Select the month and year (e.g., May 2026)
- Step 2: Click "Generate Payslips" — PayLeef automatically calculates everyone's salary
- Step 3: Review the list. Click "Adjust" next to any employee to change LOP, add bonus/overtime
- Step 4: Tick all employees → Click "Send Email" — payslips go to each employee's inbox instantly

📋 PAYSLIP HISTORY:
- See all payslips ever generated, month by month
- Download any payslip as a PDF — click the download icon
- Resend a payslip email — click the email/send icon
- Filter by month and year using the dropdowns

📊 REPORTS (very important for accountants!):
- Download official government-format reports:
  → PF Report (for EPFO submission)
  → ESI Report (for ESIC submission)
  → Professional Tax report
  → Bank Advice / Bank Transfer list (send this to your bank to do salary payments)
  → Salary Register (full month summary)
- Pick the month → click Download → file saves to your computer

📈 ANALYTICS:
- Charts showing how payroll has changed month by month
- Department-wise cost breakdown
- Salary range distribution among employees
- Export data to Excel

⚙️ PAYROLL CONFIG (set up once, then forget!):
- Set how salary is split into components: Basic (40%), HRA (40% of Basic), allowances, etc.
- Set deduction rules: PF (12% of Basic), ESI (0.75% if gross ≤ ₹21,000), Professional Tax, TDS
- Upload your company logo — appears on every payslip PDF
- Choose payslip template design (Classic, Modern, etc.)
- IMPORTANT: Save once and PayLeef uses these rules for all future payslips automatically

📅 ATTENDANCE:
- Mark each employee as: Present / Absent / Half Day for any date
- Also enter Leave types: CL (Casual Leave), SL (Sick Leave), EL (Earned Leave)
- LOP (Loss of Pay) is automatically calculated based on absences beyond leave balance
- PayLeef pulls attendance data automatically when you generate payslips

📝 FORM 16 PART B:
- Annual income tax certificate for employees
- Generate it once a year (April) for each employee
- Download as PDF and give to employees for their tax filing

📋 LEAVE POLICY:
- Set how many leaves employees get per year: e.g., 12 CL, 12 SL, 15 EL
- PayLeef tracks balances automatically as employees take leaves

📍 LOCATIONS:
- Add multiple office locations (e.g., Chennai HQ, Mumbai Office)
- Can set different payslip templates per location

💳 BILLING & PLAN:
- See your subscription plan details
- Upgrade from trial to paid
- Download your invoices

⚙️ SETTINGS:
- Update company name, address, GST number
- Email settings (for sending payslips)
- Toggle PDF password protection for payslips

INDIAN PAYROLL CONCEPTS — EXPLAINED SIMPLY:

💰 CTC (Cost to Company):
What the company spends for one employee per year. If CTC is ₹6,00,000/year → monthly = ₹50,000.
It includes salary + PF contribution + everything.

💵 Gross Salary:
What the employee earns BEFORE any deductions. = Basic + HRA + all allowances.
Example: Basic ₹20,000 + HRA ₹8,000 + Allowances ₹5,000 = Gross ₹33,000

🏦 Net Salary / Take-home:
Money that actually lands in the employee's bank account.
= Gross Salary MINUS all deductions (PF + ESI + PT + TDS).

📐 Basic Salary:
The core base pay. Usually 40-50% of gross salary.
PF and Gratuity are calculated based on Basic. Smaller basic = less PF saved.

🏠 HRA (House Rent Allowance):
Extra allowance for rent. Usually 40% of Basic.
If employee pays actual rent, they can claim HRA as tax-free under Income Tax rules.

🏛️ PF / EPF (Provident Fund):
Government savings scheme for employees' retirement.
Employee contributes: 12% of Basic Salary
Employer also contributes: 12% of Basic Salary (employer's share is NOT deducted from your salary — it's extra money from company)
Example: Basic = ₹20,000 → Employee PF = ₹2,400 deducted from salary. Employer also adds ₹2,400 separately.
All PF goes to your EPFO account — like a savings account you can withdraw on retirement or major life events.

🏥 ESI (Employee State Insurance):
Government health insurance scheme.
ONLY for employees with Gross Salary ≤ ₹21,000/month.
Employee pays: 0.75% of Gross
Employer pays: 3.25% of Gross (extra, not deducted from employee)
If gross > ₹21,000 → ESI does not apply. No deduction.

🗺️ Professional Tax (PT):
State government tax deducted from salary.
Varies by state: Maharashtra ₹200/month, Karnataka ₹200/month, TN ₹208/month (approx)
Small amount but mandatory. Goes to state government.

📉 TDS (Tax Deducted at Source):
Income Tax deducted every month from salary.
Based on annual income — calculated at year start, divided by 12 months.
High earners have more TDS deducted. Goes directly to Income Tax Department (IT Dept).
Given back as refund if you submit tax savings proofs (80C, HRA, etc.)

📅 LOP (Loss of Pay):
When an employee is absent and has used up all their leave balance.
Those extra absent days are "loss of pay" — salary is deducted proportionally.
Example: 1 LOP day out of 26 working days = salary / 26 deducted for 1 day
LOP reduces take-home salary significantly. That's why net salary may be less than expected.

COMMON QUESTIONS PEOPLE ASK:

Q: "Why is my salary different this month?"
A: Could be: 1) LOP days (absent beyond leave), 2) Salary revision, 3) More TDS this month, 4) Bonus or overtime added, 5) First month partial pay

Q: "When will I get my payslip?"
A: Usually HR generates it between 1st-5th of the next month. Ask your HR team.

Q: "Where do I download my payslip?"
A: Log in to the employee portal → Your payslips are listed there → Click Download PDF

Q: "What is 12% PF? Is my money going somewhere?"
A: Yes! 12% of your Basic Salary is saved in your EPFO retirement account. It's YOUR money — you can withdraw it when you leave the job (after cooling period) or on retirement.

Q: "Why no ESI deduction in my payslip?"
A: ESI only applies if your gross salary is ₹21,000 or less per month. If you earn more, ESI is not deducted — that's normal.

Q: "How do I generate payslips for past months?"
A: Go to Generate & Send → select the past month → generate. It works for any past month.

RULES FOR YOUR ANSWERS:
- Max 120 words per answer (unless step-by-step guide is requested)
- Use ₹ symbol for Indian rupees
- Use numbered steps (1, 2, 3) for "how to" questions
- End with an encouraging line if the topic was complex
- If user says thank you, respond warmly and offer more help
- NEVER make up numbers — only use the values mentioned in this knowledge base
- NEVER discuss other payroll software
`;

    // Build Gemini chat history from conversation history
    // We seed with a system exchange so Gemini understands who Leef is
    const seedHistory = [
      {
        role: 'user',
        parts: [{ text: 'Hello! Who are you and what can you help with?' }],
      },
      {
        role: 'model',
        parts: [{ text: SYSTEM_KNOWLEDGE + "\n\nHi there! I'm Leef 🌿 — your PayLeef helper! I can answer questions about how to use PayLeef software and explain Indian payroll concepts like PF, ESI, LOP, and more. Ask me anything — even if it sounds basic, I'm here to help! 😊" }],
      },
    ];

    // Convert frontend history to Gemini format
    const chatHistory = history
      .slice(-10) // keep last 10 messages to avoid token overflow
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

    const chat = model.startChat({
      history: [...seedHistory, ...chatHistory],
    });

    const result = await chat.sendMessage(message.trim());
    const answer = result.response.text();

    res.json({ answer });

  } catch (err) {
    console.error('[HelpBot] error:', err.message);
    if (err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      return res.json({ answer: "I've answered a lot of questions today and hit my limit! 😅 Try again tomorrow, or click the ❓ Help button in the top menu for instant guides." });
    }
    res.json({ answer: "Oops, I had a little hiccup! 😅 Please try asking again in a moment. Or click the ❓ Help button in the top menu for step-by-step guides." });
  }
});

module.exports = router;
