const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Login required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin_id    = decoded.admin_id;           // set for both admin and employee tokens
    req.employee_db_id = decoded.employee_id;     // set only on employee tokens (DB row id)
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
