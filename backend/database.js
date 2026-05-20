// database.js — PostgreSQL adapter for PayOS
// Replaces the flat JSON file store with a production-grade connection pool.

require('dotenv').config();
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'payos_db'}`,
  ssl: (isProduction || (process.env.DATABASE_URL || '').includes('sslmode=require'))
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => console.error('PostgreSQL pool error:', err));

// ── Schema creation ──────────────────────────────────────────────────────────
async function initDB() {
  const client = await pool.connect();
  try {
    // admins
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id                   SERIAL PRIMARY KEY,
        email                VARCHAR(255) UNIQUE NOT NULL,
        password             VARCHAR(255) NOT NULL,
        company_name         VARCHAR(255),
        company_address      TEXT,
        company_phone        VARCHAR(50),
        company_email        VARCHAR(255),
        company_website      VARCHAR(255),
        company_gstin        VARCHAR(50),
        company_industry     VARCHAR(100),
        company_size         VARCHAR(50),
        plan                 VARCHAR(50)  DEFAULT 'starter',
        status               VARCHAR(50)  DEFAULT 'active',
        onboarding_completed BOOLEAN      DEFAULT FALSE,
        trial_start_date     TIMESTAMPTZ,
        trial_end_date       TIMESTAMPTZ,
        trial_days           INTEGER      DEFAULT 30,
        last_active          TIMESTAMPTZ,
        created_at           TIMESTAMPTZ  DEFAULT NOW()
      )
    `);

    // employees — with password column for secure login
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id               SERIAL PRIMARY KEY,
        admin_id         INTEGER REFERENCES admins(id) ON DELETE CASCADE,
        employee_id      VARCHAR(50) NOT NULL,
        employee_name    VARCHAR(255) NOT NULL,
        email            VARCHAR(255),
        phone            VARCHAR(50),
        department       VARCHAR(100),
        designation      VARCHAR(100),
        date_of_joining  VARCHAR(50),
        salary           NUMERIC(12,2) DEFAULT 0,
        password         VARCHAR(255),
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(admin_id, employee_id)
      )
    `);

    // payslips — JSONB for earnings/deductions breakdown
    await client.query(`
      CREATE TABLE IF NOT EXISTS payslips (
        id                     SERIAL PRIMARY KEY,
        admin_id               INTEGER REFERENCES admins(id) ON DELETE CASCADE,
        employee_id            VARCHAR(50),
        employee_name          VARCHAR(255),
        department             VARCHAR(100),
        designation            VARCHAR(100),
        salary                 NUMERIC(12,2),
        net_salary             NUMERIC(12,2),
        gross_salary           NUMERIC(12,2),
        month                  INTEGER,
        year                   INTEGER,
        working_days           INTEGER       DEFAULT 26,
        present_days           INTEGER,
        lop_days               INTEGER       DEFAULT 0,
        earnings               JSONB         DEFAULT '{}',
        deductions             JSONB         DEFAULT '{}',
        total_earnings         NUMERIC(12,2),
        total_deductions       NUMERIC(12,2),
        employer_contributions JSONB         DEFAULT '{}',
        config_snapshot        JSONB,
        emailed                BOOLEAN       DEFAULT FALSE,
        emailed_at             TIMESTAMPTZ,
        created_at             TIMESTAMPTZ   DEFAULT NOW()
      )
    `);

    // Add emailed_at column to existing tables (safe to run on existing DB)
    await client.query(`
      ALTER TABLE payslips ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ
    `);

    // Add employee exit tracking columns (safe to run on existing DB)
    await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`);
    await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_exit VARCHAR(50)`);
    await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS exit_reason VARCHAR(255)`);

    // Add employee bank & statutory details
    await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(30)`);
    await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20)`);
    await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100)`);
    await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20)`);
    await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS uan_number VARCHAR(20)`);

    // Salary breakdown — yearly CTC and net salary
    await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS yearly_ctc NUMERIC(14,2)`);
    await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS net_salary_monthly NUMERIC(12,2)`);

    // Add company statutory registration numbers to admins
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS pan_number VARCHAR(30)`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS tan_number VARCHAR(30)`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS epfo_code VARCHAR(30)`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS esic_code VARCHAR(30)`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS pt_reg_number VARCHAR(30)`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS state VARCHAR(50)`);

    // payroll configs — one row per admin
    await client.query(`
      CREATE TABLE IF NOT EXISTS payroll_configs (
        id         SERIAL PRIMARY KEY,
        admin_id   INTEGER UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
        config     JSONB,
        branding   JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // audit logs — security & compliance
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id         SERIAL PRIMARY KEY,
        admin_id   INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        action     VARCHAR(100) NOT NULL,
        entity     VARCHAR(50),
        entity_id  INTEGER,
        details    JSONB,
        ip_address VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log('✅ PostgreSQL schema ready');
  } catch (err) {
    console.error('❌ Database init error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// ── Audit log helper ─────────────────────────────────────────────────────────
async function auditLog(adminId, action, entity = null, entityId = null, details = null, ip = null) {
  try {
    await pool.query(
      'INSERT INTO audit_logs (admin_id, action, entity, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [adminId, action, entity, entityId, details ? JSON.stringify(details) : null, ip]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = { pool, initDB, auditLog };
