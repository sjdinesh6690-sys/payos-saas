const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Login required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Support both admin tokens and sub-user tokens
    // Sub-user tokens have sub_user_id + admin_id
    // Admin tokens have admin_id only
    req.admin_id      = decoded.admin_id;
    req.employee_db_id = decoded.employee_id;
    req.sub_user_id   = decoded.sub_user_id || null;
    req.user_role     = decoded.role || 'admin';
    req.permissions   = decoded.permissions || null;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
