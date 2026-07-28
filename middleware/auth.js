const pool = require('../db/pool');

const COOKIE_NAME = 'session';
const COOKIE_OPTS = {
  httpOnly: true,
  signed: true,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  sameSite: 'lax',
};

function startSession(res, user) {
  res.cookie(COOKIE_NAME, JSON.stringify({ id: user.id, role: user.role }), COOKIE_OPTS);
}

function endSession(res) {
  res.clearCookie(COOKIE_NAME);
}

// Runs on every request: loads the logged-in user (if any) fresh from the
// database, so a deactivated/deleted account stops working immediately.
async function attachUser(req, res, next) {
  req.user = null;
  const raw = req.signedCookies[COOKIE_NAME];
  if (raw) {
    try {
      const { id } = JSON.parse(raw);
      const result = await pool.query(
        `SELECT u.id, u.name, u.role, u.worker_id
         FROM users u WHERE u.id = $1 AND u.is_active = TRUE`,
        [id]
      );
      if (result.rows.length) req.user = result.rows[0];
    } catch (e) {
      // malformed/forged cookie — treat as logged out
    }
  }
  res.locals.user = req.user;
  next();
}

// Restricts a route to one or more roles. Anyone else is bounced to /login.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.redirect('/login');
    }
    next();
  };
}

module.exports = { startSession, endSession, requireRole, attachUser };
