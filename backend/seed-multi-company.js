/**
 * seed-multi-company.js
 * Creates 3 demo companies with employees and 3 months of payslips
 *
 * Run: node seed-multi-company.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: { rejectUnauthorized: false },
});

// ── 3 Companies ───────────────────────────────────────────────────────────────
const COMPANIES = [
  {
    email: 'admin@nexuslogistics.in',
    password: 'Nexus@2024',
    company_name: 'Nexus Logistics Pvt. Ltd.',
    company_address: '14, Industrial Area, Phase 2, Pune – 411018',
    company_phone: '+91-20-2765-4321',
    company_email: 'hr@nexuslogistics.in',
    plan: 'professional',
    employees: [
      { employee_id: 'NLG001', employee_name: 'Rajesh Patil',      email: 'rajesh.patil@nexuslogistics.in',   department: 'Operations',   designation: 'Operations Manager',       salary: 85000, date_of_joining: '2019-06-01' },
      { employee_id: 'NLG002', employee_name: 'Sunita Desai',      email: 'sunita.desai@nexuslogistics.in',   department: 'HR',           designation: 'HR Manager',               salary: 65000, date_of_joining: '2020-02-15' },
      { employee_id: 'NLG003', employee_name: 'Manish Kulkarni',   email: 'manish.k@nexuslogistics.in',       department: 'Fleet',        designation: 'Fleet Supervisor',         salary: 55000, date_of_joining: '2021-04-10' },
      { employee_id: 'NLG004', employee_name: 'Pooja Joshi',       email: 'pooja.j@nexuslogistics.in',        department: 'Accounts',     designation: 'Senior Accountant',        salary: 60000, date_of_joining: '2020-08-01' },
      { employee_id: 'NLG005', employee_name: 'Amol Bhosale',      email: 'amol.b@nexuslogistics.in',         department: 'Fleet',        designation: 'Driver Coordinator',       salary: 42000, date_of_joining: '2022-01-20' },
      { employee_id: 'NLG006', employee_name: 'Kavitha Rao',       email: 'kavitha.r@nexuslogistics.in',      department: 'Operations',   designation: 'Warehouse Executive',      salary: 38000, date_of_joining: '2022-09-05' },
      { employee_id: 'NLG007', employee_name: 'Sanjay Shinde',     email: 'sanjay.s@nexuslogistics.in',       department: 'IT',           designation: 'IT Administrator',         salary: 52000, date_of_joining: '2021-11-12' },
      { employee_id: 'NLG008', employee_name: 'Deepa Nair',        email: 'deepa.n@nexuslogistics.in',        department: 'Sales',        designation: 'Business Development Exec',salary: 48000, date_of_joining: '2023-03-01' },
      { employee_id: 'NLG009', employee_name: 'Vinod Gaikwad',     email: 'vinod.g@nexuslogistics.in',        department: 'Operations',   designation: 'Logistics Coordinator',    salary: 40000, date_of_joining: '2023-06-15' },
      { employee_id: 'NLG010', employee_name: 'Anita Sawant',      email: 'anita.s@nexuslogistics.in',        department: 'Accounts',     designation: 'Accounts Executive',       salary: 35000, date_of_joining: '2023-10-01' },
    ],
  },
  {
    email: 'admin@brightfutureedu.in',
    password: 'BrightEdu@2024',
    company_name: 'Bright Future Education Trust',
    company_address: '88, Gandhi Nagar, Jaipur – 302015',
    company_phone: '+91-141-2356-7890',
    company_email: 'admin@brightfutureedu.in',
    plan: 'starter',
    employees: [
      { employee_id: 'BFE001', employee_name: 'Dr. Meera Sharma',   email: 'meera.sharma@brightfutureedu.in',  department: 'Academic',     designation: 'Principal',                salary: 95000, date_of_joining: '2016-07-01' },
      { employee_id: 'BFE002', employee_name: 'Rohit Agarwal',      email: 'rohit.a@brightfutureedu.in',       department: 'Academic',     designation: 'Senior Teacher – Maths',   salary: 55000, date_of_joining: '2018-06-15' },
      { employee_id: 'BFE003', employee_name: 'Nisha Gupta',        email: 'nisha.g@brightfutureedu.in',       department: 'Academic',     designation: 'Senior Teacher – Science', salary: 52000, date_of_joining: '2019-06-15' },
      { employee_id: 'BFE004', employee_name: 'Aman Verma',         email: 'aman.v@brightfutureedu.in',        department: 'Academic',     designation: 'Teacher – English',        salary: 42000, date_of_joining: '2021-06-01' },
      { employee_id: 'BFE005', employee_name: 'Priyanka Singh',     email: 'priyanka.s@brightfutureedu.in',    department: 'Admin',        designation: 'Office Administrator',     salary: 38000, date_of_joining: '2020-03-10' },
      { employee_id: 'BFE006', employee_name: 'Ramesh Yadav',       email: 'ramesh.y@brightfutureedu.in',      department: 'Accounts',     designation: 'Accountant',               salary: 40000, date_of_joining: '2019-09-01' },
      { employee_id: 'BFE007', employee_name: 'Sunita Malhotra',    email: 'sunita.m@brightfutureedu.in',      department: 'Academic',     designation: 'Teacher – Hindi',          salary: 38000, date_of_joining: '2022-06-01' },
      { employee_id: 'BFE008', employee_name: 'Ajay Bansal',        email: 'ajay.b@brightfutureedu.in',        department: 'Sports',       designation: 'Sports Coach',             salary: 35000, date_of_joining: '2022-08-01' },
      { employee_id: 'BFE009', employee_name: 'Kavya Tiwari',       email: 'kavya.t@brightfutureedu.in',       department: 'Library',      designation: 'Librarian',                salary: 32000, date_of_joining: '2023-01-15' },
      { employee_id: 'BFE010', employee_name: 'Mohan Chauhan',      email: 'mohan.c@brightfutureedu.in',       department: 'Admin',        designation: 'Peon / Office Attendant',  salary: 20000, date_of_joining: '2020-01-01' },
      { employee_id: 'BFE011', employee_name: 'Shweta Rawat',       email: 'shweta.r@brightfutureedu.in',      department: 'Academic',     designation: 'Teacher – Computer Sci',   salary: 44000, date_of_joining: '2021-06-01' },
      { employee_id: 'BFE012', employee_name: 'Vikas Choudhary',    email: 'vikas.c@brightfutureedu.in',       department: 'Security',     designation: 'Security Guard',           salary: 18000, date_of_joining: '2021-01-01' },
    ],
  },
  {
    email: 'admin@horizonhealthcare.in',
    password: 'Horizon@2024',
    company_name: 'Horizon Healthcare Pvt. Ltd.',
    company_address: '22, MG Road, Bengaluru – 560001',
    company_phone: '+91-80-4567-8901',
    company_email: 'payroll@horizonhealthcare.in',
    plan: 'professional',
    employees: [
      { employee_id: 'HHC001', employee_name: 'Dr. Arun Kumar',     email: 'arun.kumar@horizonhealthcare.in',  department: 'Medical',      designation: 'Chief Medical Officer',    salary: 180000, date_of_joining: '2017-01-15' },
      { employee_id: 'HHC002', employee_name: 'Dr. Lakshmi Menon',  email: 'lakshmi.m@horizonhealthcare.in',   department: 'Medical',      designation: 'Senior Physician',         salary: 135000, date_of_joining: '2018-04-01' },
      { employee_id: 'HHC003', employee_name: 'Dr. Farhan Siddiqui',email: 'farhan.s@horizonhealthcare.in',    department: 'Medical',      designation: 'General Surgeon',          salary: 145000, date_of_joining: '2019-07-01' },
      { employee_id: 'HHC004', employee_name: 'Radha Krishnamurthy',email: 'radha.k@horizonhealthcare.in',     department: 'Nursing',      designation: 'Head Nurse',               salary: 65000, date_of_joining: '2018-09-15' },
      { employee_id: 'HHC005', employee_name: 'Santosh Pillai',     email: 'santosh.p@horizonhealthcare.in',   department: 'Nursing',      designation: 'Staff Nurse',              salary: 40000, date_of_joining: '2021-02-01' },
      { employee_id: 'HHC006', employee_name: 'Geetha Subramaniam', email: 'geetha.s@horizonhealthcare.in',    department: 'Nursing',      designation: 'Staff Nurse',              salary: 38000, date_of_joining: '2022-05-15' },
      { employee_id: 'HHC007', employee_name: 'Prasad Hegde',       email: 'prasad.h@horizonhealthcare.in',    department: 'Admin',        designation: 'Hospital Administrator',   salary: 75000, date_of_joining: '2019-03-01' },
      { employee_id: 'HHC008', employee_name: 'Nandini Reddy',      email: 'nandini.r@horizonhealthcare.in',   department: 'HR',           designation: 'HR Executive',             salary: 48000, date_of_joining: '2021-08-01' },
      { employee_id: 'HHC009', employee_name: 'Suresh Babu',        email: 'suresh.b@horizonhealthcare.in',    department: 'Lab',          designation: 'Lab Technician',           salary: 42000, date_of_joining: '2020-11-01' },
      { employee_id: 'HHC010', employee_name: 'Ananya Bhat',        email: 'ananya.b@horizonhealthcare.in',    department: 'Pharmacy',     designation: 'Pharmacist',               salary: 55000, date_of_joining: '2020-06-01' },
      { employee_id: 'HHC011', employee_name: 'Ravi Shankar',       email: 'ravi.s@horizonhealthcare.in',      department: 'Accounts',     designation: 'Finance Manager',          salary: 70000, date_of_joining: '2018-12-01' },
      { employee_id: 'HHC012', employee_name: 'Deepika Murthy',     email: 'deepika.m@horizonhealthcare.in',   department: 'Reception',    designation: 'Front Desk Executive',     salary: 32000, date_of_joining: '2023-04-01' },
    ],
  },
];

// ── Payroll calculator ────────────────────────────────────────────────────────
function calcPayslip(salary, lopDays = 0, workingDays = 26) {
  const presentDays = workingDays - lopDays;
  const lopFactor   = presentDays / workingDays;
  const gross       = salary * lopFactor;
  const basic       = Math.round(salary * 0.40 * lopFactor);
  const hra         = Math.round(basic  * 0.40);
  const conv        = Math.round(1600   * lopFactor);
  const medical     = Math.round(1250   * lopFactor);
  const special     = Math.max(Math.round(gross - basic - hra - conv - medical), 0);
  const pf          = Math.min(Math.round(basic * 0.12), 1800);
  const esi         = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
  const pt          = salary >= 10000 ? 200 : 0;
  const totalEarnings   = basic + hra + conv + medical + special;
  const totalDeductions = pf + esi + pt;
  return {
    gross_salary: Math.round(gross),
    net_salary:   totalEarnings - totalDeductions,
    working_days: workingDays,
    present_days: presentDays,
    lop_days:     lopDays,
    total_earnings:   totalEarnings,
    total_deductions: totalDeductions,
    earnings: {
      'Basic Salary':          basic,
      'HRA':                   hra,
      'Conveyance Allowance':  conv,
      'Medical Allowance':     medical,
      'Special Allowance':     special,
    },
    deductions: {
      'PF (Employee)':    pf,
      ...(esi > 0 ? { 'ESI (Employee)': esi } : {}),
      'Professional Tax': pt,
    },
    employer_contributions: {
      'PF (Employer)': Math.min(Math.round(basic * 0.12), 1800),
    },
  };
}

function lastNMonths(n) {
  const months = [];
  const now = new Date();
  for (let i = n; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
  }
  return months;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Multi-Company Seeder starting...\n');

    const empDefaultPassword = await bcrypt.hash('Emp@1234', 10);
    const months = lastNMonths(3);

    for (const company of COMPANIES) {
      console.log(`\n🏢 Processing: ${company.company_name}`);

      // Upsert admin
      const hash = await bcrypt.hash(company.password, 10);
      const existing = await client.query('SELECT id FROM admins WHERE email=$1', [company.email]);
      let adminId;

      if (existing.rows.length) {
        adminId = existing.rows[0].id;
        await client.query(
          `UPDATE admins SET password=$1, company_name=$2, company_address=$3,
           company_phone=$4, company_email=$5, plan=$6, onboarding_completed=TRUE WHERE id=$7`,
          [hash, company.company_name, company.company_address,
           company.company_phone, company.company_email, company.plan, adminId]
        );
        console.log(`  ✅ Updated admin (id=${adminId})`);
      } else {
        const res = await client.query(
          `INSERT INTO admins (email, password, company_name, company_address,
           company_phone, company_email, plan, onboarding_completed)
           VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE) RETURNING id`,
          [company.email, hash, company.company_name, company.company_address,
           company.company_phone, company.company_email, company.plan]
        );
        adminId = res.rows[0].id;
        console.log(`  ✅ Created admin (id=${adminId})`);
      }

      // Upsert employees
      for (const emp of company.employees) {
        await client.query(`
          INSERT INTO employees
            (admin_id, employee_id, employee_name, email, department,
             designation, date_of_joining, salary, password)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (admin_id, employee_id) DO UPDATE SET
            employee_name   = EXCLUDED.employee_name,
            email           = EXCLUDED.email,
            department      = EXCLUDED.department,
            designation     = EXCLUDED.designation,
            date_of_joining = EXCLUDED.date_of_joining,
            salary          = EXCLUDED.salary
        `, [adminId, emp.employee_id, emp.employee_name, emp.email,
            emp.department, emp.designation, emp.date_of_joining,
            emp.salary, empDefaultPassword]);
      }
      console.log(`  ✅ ${company.employees.length} employees seeded`);

      // Generate payslips for last 3 months
      let totalSlips = 0;
      for (const { month, year } of months) {
        await client.query(
          'DELETE FROM payslips WHERE admin_id=$1 AND month=$2 AND year=$3',
          [adminId, month, year]
        );
        for (const emp of company.employees) {
          const lop = Math.random() > 0.85 ? 1 : 0;
          const calc = calcPayslip(emp.salary, lop);
          await client.query(`
            INSERT INTO payslips
              (admin_id, employee_id, employee_name, department, designation,
               salary, gross_salary, net_salary, month, year,
               working_days, present_days, lop_days,
               earnings, deductions, total_earnings, total_deductions,
               employer_contributions, emailed)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
          `, [
            adminId, emp.employee_id, emp.employee_name, emp.department, emp.designation,
            emp.salary, calc.gross_salary, calc.net_salary, month, year,
            calc.working_days, calc.present_days, calc.lop_days,
            JSON.stringify(calc.earnings), JSON.stringify(calc.deductions),
            calc.total_earnings, calc.total_deductions,
            JSON.stringify(calc.employer_contributions),
            true,
          ]);
          totalSlips++;
        }
        console.log(`  📄 ${company.employees.length} payslips → ${month}/${year}`);
      }
      console.log(`  ✅ ${totalSlips} total payslips created`);
    }

    console.log('\n══════════════════════════════════════════════════════');
    console.log('🎉 ALL COMPANIES SEEDED SUCCESSFULLY\n');
    console.log('Company 1 — Nexus Logistics Pvt. Ltd.');
    console.log('  Login : admin@nexuslogistics.in / Nexus@2024');
    console.log('  Employees : NLG001–NLG010  |  Pass: Emp@1234\n');
    console.log('Company 2 — Bright Future Education Trust');
    console.log('  Login : admin@brightfutureedu.in / BrightEdu@2024');
    console.log('  Employees : BFE001–BFE012  |  Pass: Emp@1234\n');
    console.log('Company 3 — Horizon Healthcare Pvt. Ltd.');
    console.log('  Login : admin@horizonhealthcare.in / Horizon@2024');
    console.log('  Employees : HHC001–HHC012  |  Pass: Emp@1234\n');
    console.log('Original Demo Account (unchanged):');
    console.log('  Login : demo@payos.com / Demo@1234');
    console.log('══════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
