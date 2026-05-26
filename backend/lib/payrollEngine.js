// payrollEngine.js — Dynamic per-company payroll calculation engine
// Each SaaS client (admin) has their own independent config stored in DB.

// ── TDS / Income Tax Calculation (India) ────────────────────────────────────
/**
 * Calculate monthly TDS for an employee.
 * @param {number} annualGross - Annual gross salary (monthly × 12)
 * @param {string} regime      - 'new' (default) or 'old'
 * @returns {number} Monthly TDS in INR (rounded)
 */
function calculateMonthlyTDS(annualGross, regime = 'new') {
  let taxableIncome = 0;
  let annualTax = 0;

  if (regime === 'old') {
    // Old Tax Regime — Standard deduction ₹50,000
    const stdDeduction = 50000;
    taxableIncome = Math.max(0, annualGross - stdDeduction);

    if (taxableIncome <= 250000)       annualTax = 0;
    else if (taxableIncome <= 500000)  annualTax = (taxableIncome - 250000) * 0.05;
    else if (taxableIncome <= 1000000) annualTax = 12500 + (taxableIncome - 500000) * 0.20;
    else                               annualTax = 112500 + (taxableIncome - 1000000) * 0.30;

    // Rebate u/s 87A: if taxable income ≤ ₹5L → rebate up to ₹12,500
    if (taxableIncome <= 500000) annualTax = Math.max(0, annualTax - 12500);

  } else {
    // New Tax Regime (FY 2025-26) — Standard deduction ₹75,000
    const stdDeduction = 75000;
    taxableIncome = Math.max(0, annualGross - stdDeduction);

    if (taxableIncome <= 300000)        annualTax = 0;
    else if (taxableIncome <= 700000)   annualTax = (taxableIncome - 300000) * 0.05;
    else if (taxableIncome <= 1000000)  annualTax = 20000 + (taxableIncome - 700000) * 0.10;
    else if (taxableIncome <= 1200000)  annualTax = 50000 + (taxableIncome - 1000000) * 0.15;
    else if (taxableIncome <= 1500000)  annualTax = 80000 + (taxableIncome - 1200000) * 0.20;
    else                                annualTax = 140000 + (taxableIncome - 1500000) * 0.30;

    // Rebate u/s 87A: if taxable income ≤ ₹7L → zero tax
    if (taxableIncome <= 700000) annualTax = 0;
  }

  // Add 4% Health & Education Cess
  annualTax = annualTax * 1.04;

  // Monthly TDS = annual tax ÷ 12, rounded to nearest rupee
  return Math.max(0, Math.round(annualTax / 12));
}

// ── State-wise Professional Tax ──────────────────────────────────────────────
/**
 * Return the correct PT amount based on state and monthly gross.
 * @param {string} state       - State name (case-insensitive)
 * @param {number} monthlyGross - Employee's gross monthly salary
 * @returns {number} PT amount in INR
 */
function getStatePT(state, monthlyGross) {
  const s = (state || '').toLowerCase().replace(/[\s_-]/g, '');

  if (s.includes('karnataka'))
    return monthlyGross > 15000 ? 200 : 0;

  if (s.includes('maharashtra')) {
    if (monthlyGross <= 7500)  return 0;
    if (monthlyGross <= 10000) return 175;
    return 200;
  }

  if (s.includes('tamilnadu') || s.includes('tamil'))
    return 0; // Tamil Nadu abolished PT

  if (s.includes('andhrapradesh') || s.includes('andhra')) {
    if (monthlyGross <= 15000) return 0;
    if (monthlyGross <= 20000) return 150;
    return 200;
  }

  if (s.includes('telangana')) {
    if (monthlyGross <= 15000) return 0;
    if (monthlyGross <= 20000) return 150;
    return 200;
  }

  if (s.includes('westbengal') || s.includes('west')) {
    if (monthlyGross <= 8500)  return 0;
    if (monthlyGross <= 10000) return 90;
    if (monthlyGross <= 15000) return 110;
    if (monthlyGross <= 25000) return 130;
    if (monthlyGross <= 40000) return 150;
    return 200;
  }

  if (s.includes('gujarat')) {
    if (monthlyGross < 6000)   return 0;
    if (monthlyGross < 9000)   return 80;
    if (monthlyGross < 12000)  return 150;
    return 200;
  }

  if (s.includes('kerala')) {
    if (monthlyGross <= 11500) return 0;
    if (monthlyGross <= 23000) return 150;
    return 200;
  }

  if (s.includes('madhyapradesh') || s.includes('madhya'))
    return monthlyGross > 18750 ? 208 : 0;

  if (s.includes('punjab') || s.includes('haryana'))
    return monthlyGross > 20833 ? 200 : 0;

  // Default: most other states with PT — ₹200 above ₹15,000
  return monthlyGross > 15000 ? 200 : 0;
}

const DEFAULT_CONFIG = {
  earnings: [
    { key: 'basic',      label: 'Basic Salary',         type: 'pct_of_gross',  value: 40,   enabled: true,  order: 1 },
    { key: 'hra',        label: 'HRA',                  type: 'pct_of_basic',  value: 40,   enabled: true,  order: 2 },
    { key: 'da',         label: 'Dearness Allowance',   type: 'pct_of_basic',  value: 10,   enabled: false, order: 3 },
    { key: 'conveyance', label: 'Conveyance Allowance', type: 'fixed',         value: 1600, enabled: true,  order: 4 },
    { key: 'medical',    label: 'Medical Allowance',    type: 'fixed',         value: 1250, enabled: true,  order: 5 },
    { key: 'special',    label: 'Special Allowance',    type: 'remainder',     value: 0,    enabled: true,  order: 6 },
    { key: 'overtime',   label: 'Overtime',             type: 'manual',        value: 0,    enabled: true,  order: 7 },
    { key: 'incentive',  label: 'Incentive',            type: 'manual',        value: 0,    enabled: true,  order: 8 },
    { key: 'bonus',      label: 'Bonus',                type: 'manual',        value: 0,    enabled: true,  order: 9 },
  ],
  deductions: [
    { key: 'pf_employee',     label: 'PF (Employee)',      type: 'pct_of_basic', value: 12,   cap: 1800,  enabled: true,  order: 1 },
    { key: 'esi_employee',    label: 'ESI (Employee)',     type: 'pct_of_gross', value: 0.75, threshold: 21000, threshold_type: 'max_gross', enabled: true,  order: 2 },
    { key: 'pt',              label: 'Professional Tax',   type: 'fixed',        value: 200,  enabled: true,  order: 3 },
    { key: 'tds',             label: 'TDS (Income Tax)',   type: 'tds',          value: 0,    enabled: true,  order: 4 },
    { key: 'lop',             label: 'Loss of Pay (LOP)', type: 'lop',          value: 0,    enabled: true,  order: 5 },
    { key: 'other_deduction', label: 'Other Deduction',   type: 'manual',       value: 0,    enabled: false, order: 6 },
  ],
};

function getDefaultConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

/**
 * calculatePayslip — core calculation engine
 *
 * Fix: All per-component values are kept as floats during calculation.
 *      Rounding (Math.round) is applied only once at the end, after all
 *      totals are summed. This prevents ±2 rupee drift from cascaded rounding.
 *
 * Fix: LOP is calculated on effective gross (gross * presentDays/workingDays),
 *      so pct-of-gross earnings reflect actual days worked.
 *
 * Fix: net_salary is floored at 0 — cannot be negative.
 *
 * @param {object} employee   { salary, ... }
 * @param {object} config     { earnings: [], deductions: [] }
 * @param {object} adj        per-employee manual overrides
 */
function calculatePayslip(employee, config, adj = {}) {
  const gross       = parseFloat(employee.salary) || 0;
  const workingDays = parseInt(adj.working_days) || 26;
  const presentDays = adj.present_days != null ? parseInt(adj.present_days) : workingDays;
  const lopDays     = adj.lop_override != null
    ? Math.max(0, parseInt(adj.lop_override))
    : Math.max(0, workingDays - presentDays);

  // Effective gross: prorated for LOP days — used for all % calculations
  // This ensures HRA, DA, etc. are calculated on the actual payable gross
  const effectiveGross = lopDays > 0 && workingDays > 0
    ? gross * (presentDays / workingDays)
    : gross;

  const earnings   = {};   // float values — rounded only at the end
  const deductions = {};   // float values — rounded only at the end

  const sortedEarnings   = [...(config.earnings   || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const sortedDeductions = [...(config.deductions || [])].sort((a, b) => (a.order || 0) - (b.order || 0));

  // ── 1. Calculate earnings ────────────────────────────────────────────────
  for (const comp of sortedEarnings) {
    if (!comp.enabled) continue;
    let amount = 0;
    const basic = earnings['basic'] || 0;

    switch (comp.type) {
      case 'pct_of_gross':
        // Use effectiveGross so basic (and other % components) reflect actual days worked
        amount = (effectiveGross * (parseFloat(comp.value) || 0)) / 100;
        break;
      case 'pct_of_basic':
        amount = (basic * (parseFloat(comp.value) || 0)) / 100;
        break;
      case 'pct_of_component': {
        const ref = earnings[comp.of] || 0;
        amount = (ref * (parseFloat(comp.value) || 0)) / 100;
        break;
      }
      case 'fixed':
        amount = parseFloat(comp.value) || 0;
        break;
      case 'remainder': {
        // Sum all non-manual, non-remainder earnings already calculated
        const allocated = sortedEarnings
          .filter(c => c.enabled && c.type !== 'manual' && c.type !== 'remainder' && c.key !== comp.key)
          .reduce((s, c) => s + (earnings[c.key] || 0), 0);
        amount = Math.max(0, effectiveGross - allocated);
        break;
      }
      case 'manual':
        amount = parseFloat(adj[comp.key]) || 0;
        break;
    }
    earnings[comp.key] = amount;   // store as float — NO Math.round here
  }

  const totalEarningsFloat = Object.values(earnings).reduce((s, v) => s + v, 0);

  // ── 2. Calculate deductions ──────────────────────────────────────────────
  const basic = earnings['basic'] || 0;

  for (const comp of sortedDeductions) {
    if (!comp.enabled) continue;
    let amount = 0;

    switch (comp.type) {
      case 'pct_of_gross': {
        // Threshold check against effectiveGross (the actual payable salary)
        if (comp.threshold_type === 'max_gross' && effectiveGross > (parseFloat(comp.threshold) || Infinity)) {
          amount = 0; break;
        }
        amount = (effectiveGross * (parseFloat(comp.value) || 0)) / 100;
        if (comp.cap) amount = Math.min(amount, parseFloat(comp.cap));
        break;
      }
      case 'pct_of_basic': {
        amount = (basic * (parseFloat(comp.value) || 0)) / 100;
        if (comp.cap) amount = Math.min(amount, parseFloat(comp.cap));
        break;
      }
      case 'pct_of_component': {
        const ref = earnings[comp.of] || deductions[comp.of] || 0;
        amount = (ref * (parseFloat(comp.value) || 0)) / 100;
        if (comp.cap) amount = Math.min(amount, parseFloat(comp.cap));
        break;
      }
      case 'fixed':
        // PT: use state-wise slab if employee state is provided
        if (comp.key === 'pt' && adj.state) {
          amount = getStatePT(adj.state, effectiveGross);
        } else {
          amount = parseFloat(comp.value) || 0;
        }
        break;
      case 'tds': {
        // Auto-calculate TDS based on annual salary + tax regime
        const annualGross = effectiveGross * 12;
        const regime = adj.tax_regime || 'new';
        amount = calculateMonthlyTDS(annualGross, regime);
        // Allow manual TDS override (e.g. employee declared investments)
        if (adj.tds != null && parseFloat(adj.tds) >= 0) {
          amount = parseFloat(adj.tds);
        }
        break;
      }
      case 'lop':
        // LOP amount shown for transparency on payslip.
        // Note: earnings are already calculated on effectiveGross (prorated),
        // so LOP is informational here — the reduction is already in earnings.
        // We set lop deduction = 0 to avoid double-counting.
        amount = 0;
        break;
      case 'manual':
        amount = parseFloat(adj[comp.key]) || 0;
        break;
      case 'slab': {
        const slabs = comp.slabs || [];
        for (const slab of slabs) {
          if (effectiveGross >= (slab.min || 0) && (slab.max == null || effectiveGross <= slab.max)) {
            amount = slab.amount || 0; break;
          }
        }
        break;
      }
    }
    deductions[comp.key] = amount;   // store as float — NO Math.round here
  }

  const totalDeductionsFloat = Object.values(deductions).reduce((s, v) => s + v, 0);

  // ── 3. Round ALL components once, at the very end ────────────────────────
  for (const k of Object.keys(earnings))   earnings[k]   = Math.round(earnings[k]);
  for (const k of Object.keys(deductions)) deductions[k] = Math.round(deductions[k]);

  const totalEarnings   = Object.values(earnings).reduce((s, v)   => s + v, 0);
  const totalDeductions = Object.values(deductions).reduce((s, v) => s + v, 0);

  // Floor at zero — net salary can never be negative
  const netSalary = Math.max(0, totalEarnings - totalDeductions);

  // ── 4. Employer contributions ────────────────────────────────────────────
  const employer = {};
  const pfComp   = sortedDeductions.find(c => c.key === 'pf_employee' && c.enabled);
  if (pfComp && basic > 0) {
    employer.pf_employer = Math.round(Math.min(basic * 0.12, parseFloat(pfComp.cap) || 1800));
  }
  const esiComp = sortedDeductions.find(c => c.key === 'esi_employee' && c.enabled);
  if (esiComp && effectiveGross <= (parseFloat(esiComp.threshold) || 21000)) {
    employer.esi_employer = Math.round(effectiveGross * 0.0325);
  }

  return {
    gross_salary:           gross,
    working_days:           workingDays,
    present_days:           presentDays,
    lop_days:               lopDays,
    earnings,
    deductions,
    total_earnings:         totalEarnings,
    total_deductions:       totalDeductions,
    net_salary:             netSalary,
    employer_contributions: employer,
  };
}

module.exports = { getDefaultConfig, calculatePayslip, calculateMonthlyTDS, getStatePT };
