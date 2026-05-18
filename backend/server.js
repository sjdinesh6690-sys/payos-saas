require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const path        = require('path');
const fs          = require('fs');
const { initDB }  = require('./database');

const app = express();

// ── Security headers (Helmet) ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disabled so the React app can load correctly
  crossOriginEmbedderPolicy: false,
}));

// ── CORS — allow localhost for dev + production Render URL ───────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  'https://payos-saas.onrender.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Also allow any *.onrender.com for preview deploys
    if (origin.endsWith('.onrender.com')) return callback(null, true);
    callback(new Error('CORS policy: Origin not allowed'));
  },
  credentials: true,
}));

// ── Body parsing — 2MB limit (prevents DoS via huge payloads) ────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Global rate limiter — 200 requests / 15 min per IP ───────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// ── Auth rate limiter — 10 attempts / 15 min (brute-force protection) ────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  skipSuccessfulRequests: true,
});
app.use('/api/auth/admin-login',    authLimiter);
app.use('/api/auth/employee-login', authLimiter);
app.use('/api/super-admin/login',   authLimiter);

// ── Init database & routes ────────────────────────────────────────────────────
initDB().then(async () => {
  // Auto-seed demo account on first run (if no admins exist)
  try {
    const { pool } = require('./database');
    const bcrypt = require('bcryptjs');
    const { rows } = await pool.query('SELECT COUNT(*) as cnt FROM admins');
    if (parseInt(rows[0].cnt) === 0) {
      const hash = await bcrypt.hash('Demo@1234', 10);
      await pool.query(
        `INSERT INTO admins (email, password, company_name, company_address, company_phone, company_email, plan, status, onboarding_completed, trial_start_date, trial_end_date, trial_days)
         VALUES ($1,$2,$3,$4,$5,$6,'starter','active',TRUE,NOW(),NOW()+INTERVAL '30 days',30)`,
        ['demo@payos.com', hash, 'TechSolutions India Pvt Ltd', 'Chennai, Tamil Nadu', '+91-9876543210', 'hr@techsolutions.in']
      );
      console.log('✅ Demo account created: demo@payos.com / Demo@1234');
    }
  } catch (e) {
    console.error('⚠️  Auto-seed skipped:', e.message);
  }
  app.use('/api/auth',           require('./routes/auth'));
  app.use('/api/payslips',       require('./routes/payslips'));
  app.use('/api/employees',      require('./routes/employees'));
  app.use('/api/analytics',      require('./routes/analytics'));
  app.use('/api/payroll-config', require('./routes/payroll-config'));
  app.use('/api/email',          require('./routes/email'));
  app.use('/api/reports',        require('./routes/reports'));
  app.use('/api/super-admin',    require('./routes/super-admin'));
  app.use('/api/admin-profile',  require('./routes/admin-profile'));
  app.use('/api/ai',             require('./routes/ai'));

  // Health check
  app.get('/api/health', (req, res) => res.json({ status: 'ok', db: 'postgresql' }));

  // Serve frontend build if it exists
  const DIST = path.join(__dirname, '../frontend/dist');
  if (fs.existsSync(DIST)) {
    app.use(express.static(DIST));
    app.get('*', (req, res) => res.sendFile(path.join(DIST, 'index.html')));
  }

  const PORT = process.env.PORT || 3001;
  const server = app.listen(PORT, () => {
    console.log(`🚀 PayOS server running on port ${PORT}`);
    console.log(`✅ API ready at http://localhost:${PORT}/api/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') console.error(`❌ Port ${PORT} already in use.`);
    else console.error('Server error:', err);
    process.exit(1);
  });

}).catch((err) => {
  console.error('❌ Failed to initialise database:', err.message);
  process.exit(1);
});

process.on('uncaughtException',  (err) => console.error('Uncaught:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled:', err));
