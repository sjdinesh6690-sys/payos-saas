const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

const employerOnly = (req, res, next) => {
  if (req.user.role !== 'employer') return res.status(403).json({ error: 'Access denied.' });
  next();
};

const employeeOnly = (req, res, next) => {
  if (req.user.role !== 'employee') return res.status(403).json({ error: 'Access denied.' });
  next();
};

module.exports = { authMiddleware, employerOnly, employeeOnly };
