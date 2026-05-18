/**
 * routes/ai.js — PayOS AI Features (powered by Google Gemini — Free Tier)
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

router.use(authCheck);

const MONTHS = ['','January','February','March','April','May','June',
  'July','August','September','October','November','December'];

function getGemini() {
  if (!process.env.GEMINI_API_KEY) return null;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-pro' });
}

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

    const prompt = `You are a friendly payroll assistant for PayOS, a payroll software used by Indian companies.
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
    if (err.message?.includes('API_KEY')) {
      return res.status(503).json({ error: 'AI API key invalid. Contact your admin.' });
    }
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
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
    if (err.message?.includes('API_KEY')) {
      return res.status(503).json({ error: 'AI API key invalid. Check GEMINI_API_KEY in Render settings.' });
    }
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

module.exports = router;
