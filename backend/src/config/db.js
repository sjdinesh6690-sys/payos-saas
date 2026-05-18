const { createClient } = require('@libsql/client');

let client;

const getClient = () => {
  if (!client) {
    client = createClient({
      url:       process.env.TURSO_URL,
      authToken: process.env.TURSO_TOKEN,
    });
  }
  return client;
};

// Generic helper — runs a query and returns rows as plain objects
const query = async (sql, args = []) => {
  const c = getClient();
  const result = await c.execute({ sql, args });
  return result.rows.map(row => Object.fromEntries(Object.entries(row)));
};

// Table helper factory — creates find/findOne/insert/update/deleteWhere for any table
const makeTable = (tableName) => ({
  find:    async (predicate) => (await query(`SELECT * FROM ${tableName}`)).filter(predicate),
  findAll: async () => query(`SELECT * FROM ${tableName}`),
  findOne: async (predicate) => {
    const rows = await query(`SELECT * FROM ${tableName}`);
    return rows.find(predicate) || null;
  },
  insert: async (data) => {
    const keys   = Object.keys(data);
    const values = Object.values(data);
    const sql    = `INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`;
    const c      = getClient();
    const result = await c.execute({ sql, args: values });
    return { id: Number(result.lastInsertRowid), ...data };
  },
  update: async (predicate, updates) => {
    const all  = await query(`SELECT * FROM ${tableName}`);
    const rows = all.filter(predicate);
    for (const row of rows) {
      const keys   = Object.keys(updates);
      const values = [...Object.values(updates), row.id];
      const sql    = `UPDATE ${tableName} SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`;
      await getClient().execute({ sql, args: values });
    }
  },
  deleteWhere: async (predicate) => {
    const all  = await query(`SELECT * FROM ${tableName}`);
    const rows = all.filter(predicate);
    for (const row of rows) {
      await getClient().execute({ sql: `DELETE FROM ${tableName} WHERE id=?`, args: [row.id] });
    }
  },
});

// ── Schema Definition ──────────────────────────────────────────────────────
const initDB = async () => {
  const c = getClient();

  await c.execute(`CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT,
    employee_id   TEXT,
    role          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT DEFAULT (datetime('now'))
  )`);

  await c.execute(`CREATE TABLE IF NOT EXISTS employees (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id   TEXT NOT NULL UNIQUE,
    employee_name TEXT NOT NULL,
    department    TEXT,
    user_id       INTEGER,
    created_at    TEXT DEFAULT (datetime('now'))
  )`);

  await c.execute(`CREATE TABLE IF NOT EXISTS payslips (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id    TEXT NOT NULL,
    employee_name  TEXT NOT NULL,
    department     TEXT,
    month          TEXT NOT NULL,
    basic_salary   REAL NOT NULL,
    hra            REAL DEFAULT 0,
    food_allowance REAL DEFAULT 0,
    total_salary   REAL NOT NULL,
    created_at     TEXT DEFAULT (datetime('now'))
  )`);

  await c.execute(`CREATE TABLE IF NOT EXISTS upload_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    month           TEXT NOT NULL,
    filename        TEXT,
    total_employees INTEGER,
    created_at      TEXT DEFAULT (datetime('now'))
  )`);

  console.log('✅ Database initialised.');
};

// ── Export ─────────────────────────────────────────────────────────────────
const db = {
  users:          makeTable('users'),
  employees:      makeTable('employees'),
  payslips:       makeTable('payslips'),
  upload_history: makeTable('upload_history'),
};

module.exports = { db, initDB };
