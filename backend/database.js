// database.js — PostgreSQL adapter for PayLeef
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

    // Location / branch
    await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS location VARCHAR(100)`);

    // Employee portal access
    await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_access_enabled BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_temp_password BOOLEAN DEFAULT true`);
    await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_reset_token VARCHAR(128)`);
    await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_reset_expires TIMESTAMPTZ`);

    // Attendance table — monthly attendance per employee
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id           SERIAL PRIMARY KEY,
        admin_id     INTEGER REFERENCES admins(id) ON DELETE CASCADE,
        employee_id  VARCHAR(50) NOT NULL,
        month        INTEGER NOT NULL,
        year         INTEGER NOT NULL,
        working_days INTEGER DEFAULT 26,
        present_days INTEGER DEFAULT 26,
        lop_days     INTEGER DEFAULT 0,
        notes        VARCHAR(255),
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(admin_id, employee_id, month, year)
      )
    `);

    // ── Leave Policy (company-wide) ───────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_policies (
        id                      SERIAL PRIMARY KEY,
        admin_id                INTEGER UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
        casual_leave_days       INTEGER     DEFAULT 12,
        sick_leave_days         INTEGER     DEFAULT 12,
        earned_leave_days       INTEGER     DEFAULT 15,
        working_days_per_month  INTEGER     DEFAULT 26,
        leave_year_start_month  INTEGER     DEFAULT 4,
        created_at              TIMESTAMPTZ DEFAULT NOW(),
        updated_at              TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add leave type columns to attendance table
    await client.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS casual_leave  INTEGER DEFAULT 0`);
    await client.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS sick_leave    INTEGER DEFAULT 0`);
    await client.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS earned_leave  INTEGER DEFAULT 0`);

    // ── Billing: Subscriptions ────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id             SERIAL PRIMARY KEY,
        admin_id       INTEGER UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
        employee_limit INTEGER      DEFAULT 5,
        paid_until     TIMESTAMPTZ,
        status         VARCHAR(20)  DEFAULT 'inactive',
        created_at     TIMESTAMPTZ  DEFAULT NOW(),
        updated_at     TIMESTAMPTZ  DEFAULT NOW()
      )
    `);

    // ── Billing: Payments (every Razorpay transaction) ────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id                   SERIAL PRIMARY KEY,
        admin_id             INTEGER REFERENCES admins(id) ON DELETE CASCADE,
        razorpay_order_id    VARCHAR(100),
        razorpay_payment_id  VARCHAR(100),
        payment_type         VARCHAR(20)  DEFAULT 'base_plan',
        employee_slots       INTEGER      DEFAULT 5,
        base_amount          NUMERIC(10,2),
        gst_amount           NUMERIC(10,2),
        total_amount         NUMERIC(10,2),
        status               VARCHAR(20)  DEFAULT 'pending',
        notes                VARCHAR(255),
        created_at           TIMESTAMPTZ  DEFAULT NOW()
      )
    `);

    // Add company statutory registration numbers to admins
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS pan_number VARCHAR(30)`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS tan_number VARCHAR(30)`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS epfo_code VARCHAR(30)`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS esic_code VARCHAR(30)`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS pt_reg_number VARCHAR(30)`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS state VARCHAR(50)`);

    // Password reset tokens
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_token VARCHAR(128)`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ`);

    // Email verification
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS email_verify_token VARCHAR(128)`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS email_verify_expires TIMESTAMPTZ`);

    // Logo URL and brand color (branding)
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS logo_url TEXT`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS brand_color VARCHAR(20) DEFAULT '#1B4F8A'`);

    // Terms & Conditions acceptance
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ`);

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

    // ── Locations (branches / offices) ───────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id         SERIAL PRIMARY KEY,
        admin_id   INTEGER REFERENCES admins(id) ON DELETE CASCADE,
        name       VARCHAR(100) NOT NULL,
        city       VARCHAR(100),
        state      VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(admin_id, name)
      )
    `);

    // ── Admin sub-users (staff with module access) ───────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id          SERIAL PRIMARY KEY,
        admin_id    INTEGER REFERENCES admins(id) ON DELETE CASCADE,
        name        VARCHAR(255) NOT NULL,
        email       VARCHAR(255) NOT NULL,
        password    VARCHAR(255) NOT NULL,
        role        VARCHAR(50)  DEFAULT 'staff',
        permissions JSONB        DEFAULT '{}',
        status      VARCHAR(20)  DEFAULT 'active',
        created_at  TIMESTAMPTZ  DEFAULT NOW(),
        UNIQUE(admin_id, email)
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

    // error logs — self-hosted error monitoring (no Sentry needed)
    await client.query(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id          SERIAL PRIMARY KEY,
        source      VARCHAR(20)  NOT NULL DEFAULT 'backend', -- 'backend' | 'frontend'
        severity    VARCHAR(20)  NOT NULL DEFAULT 'error',   -- 'error' | 'warning' | 'info'
        message     TEXT         NOT NULL,
        stack       TEXT,
        url         TEXT,                -- page URL (frontend) or route (backend)
        user_agent  TEXT,
        admin_id    INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        context     JSONB,              -- extra info: component, action, etc.
        resolved    BOOLEAN      DEFAULT FALSE,
        created_at  TIMESTAMPTZ  DEFAULT NOW()
      )
    `);

    // ── Secure Payment Workflow Tables ───────────────────────────────────────

    // Customer details captured before payment
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_customers (
        id               SERIAL PRIMARY KEY,
        admin_id         INTEGER REFERENCES admins(id) ON DELETE CASCADE,
        full_name        VARCHAR(255) NOT NULL,
        company_name     VARCHAR(255) NOT NULL,
        mobile           VARCHAR(20)  NOT NULL,
        email            VARCHAR(255) NOT NULL,
        accounts_email   VARCHAR(255),
        has_gst          BOOLEAN      DEFAULT FALSE,
        gst_number       VARCHAR(20),
        billing_name     VARCHAR(255),
        billing_address  TEXT,
        state            VARCHAR(100),
        pincode          VARCHAR(10),
        created_at       TIMESTAMPTZ  DEFAULT NOW()
      )
    `);

    // One row per Razorpay order (tracks full payment lifecycle)
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_orders (
        id                   SERIAL PRIMARY KEY,
        admin_id             INTEGER REFERENCES admins(id) ON DELETE CASCADE,
        customer_id          INTEGER REFERENCES payment_customers(id),
        razorpay_order_id    VARCHAR(100) UNIQUE NOT NULL,
        razorpay_payment_id  VARCHAR(100),
        razorpay_signature   VARCHAR(500),
        plan_name            VARCHAR(100) NOT NULL,
        plan_months          INTEGER      DEFAULT 1,
        employee_slots       INTEGER      DEFAULT 5,
        base_amount          NUMERIC(10,2) NOT NULL,
        gst_amount           NUMERIC(10,2) NOT NULL,
        total_amount         NUMERIC(10,2) NOT NULL,
        status               VARCHAR(30)   DEFAULT 'pending',
        verified_via         VARCHAR(20),
        webhook_received     BOOLEAN       DEFAULT FALSE,
        verified_at          TIMESTAMPTZ,
        metadata             JSONB         DEFAULT '{}',
        created_at           TIMESTAMPTZ   DEFAULT NOW(),
        updated_at           TIMESTAMPTZ   DEFAULT NOW()
      )
    `);

    // Invoice serial counter — one row per FY year, resets on April 1
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_serials (
        fy_year      INTEGER PRIMARY KEY,
        last_serial  INTEGER DEFAULT 0
      )
    `);

    // Tax invoices — created only after successful payment verification
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id               SERIAL PRIMARY KEY,
        admin_id         INTEGER REFERENCES admins(id) ON DELETE CASCADE,
        order_id         INTEGER REFERENCES payment_orders(id),
        invoice_number   VARCHAR(20) UNIQUE NOT NULL,
        fy_year          INTEGER NOT NULL,
        serial_number    INTEGER NOT NULL,
        plan_name        VARCHAR(100),
        base_amount      NUMERIC(10,2) NOT NULL,
        cgst_amount      NUMERIC(10,2) DEFAULT 0,
        sgst_amount      NUMERIC(10,2) DEFAULT 0,
        igst_amount      NUMERIC(10,2) DEFAULT 0,
        total_amount     NUMERIC(10,2) NOT NULL,
        customer_name    VARCHAR(255),
        customer_email   VARCHAR(255),
        customer_mobile  VARCHAR(20),
        company_name     VARCHAR(255),
        gst_number       VARCHAR(20),
        billing_address  TEXT,
        state            VARCHAR(100),
        pdf_generated    BOOLEAN       DEFAULT FALSE,
        email_sent       BOOLEAN       DEFAULT FALSE,
        retry_count      INTEGER       DEFAULT 0,
        created_at       TIMESTAMPTZ   DEFAULT NOW()
      )
    `);

    // Payment event logs — full audit trail
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_logs (
        id                   SERIAL PRIMARY KEY,
        admin_id             INTEGER,
        order_id             INTEGER,
        event_type           VARCHAR(100),
        razorpay_order_id    VARCHAR(100),
        razorpay_payment_id  VARCHAR(100),
        status               VARCHAR(50),
        details              JSONB DEFAULT '{}',
        created_at           TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Email retry queue — auto-retried if invoice/email fails
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_retry_queue (
        id            SERIAL PRIMARY KEY,
        invoice_id    INTEGER REFERENCES invoices(id),
        email_type    VARCHAR(50),
        to_email      VARCHAR(255),
        subject       VARCHAR(500),
        retry_count   INTEGER     DEFAULT 0,
        max_retries   INTEGER     DEFAULT 3,
        last_error    TEXT,
        status        VARCHAR(30) DEFAULT 'pending',
        next_retry_at TIMESTAMPTZ DEFAULT NOW(),
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Locations — separate payslip config per location
    await client.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS separate_payslip BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS address TEXT`);
    await client.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS payslip_template VARCHAR(50) DEFAULT 'modern'`);
    // Fix old rows that have 'default' stored — map to 'modern'
    await client.query(`UPDATE locations SET payslip_template = 'modern' WHERE payslip_template = 'default' OR payslip_template IS NULL`);

    // Subscriptions — track plan type (monthly / yearly)
    await client.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'base_plan'`);

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
