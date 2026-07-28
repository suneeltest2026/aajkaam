const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { hashPin } = require('../db/pin');
const { logActivity } = require('../db/activity');
const { requireRole } = require('../middleware/auth');

function actor(req) {
  return req.user
    ? { userId: req.user.id, userName: req.user.name, role: req.user.role }
    : { userId: null, userName: 'System (bootstrap)', role: null };
}

// Creating an admin login is never exposed in Setup -> Users, and this page
// is never linked from anywhere in the app — reachable only by someone who
// already knows the URL. Open only for the very first admin account, or to
// an admin adding another; management can't reach this even by guessing it.
async function canAccessAdminSetup(req) {
  if (req.user) return req.user.role === 'admin';
  const count = await pool.query(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin'`);
  return count.rows[0].n === 0;
}

router.get('/setup', async (req, res) => {
  if (!(await canAccessAdminSetup(req))) return res.redirect('/login');
  res.render('admin/setup', { error: req.query.error, created: req.query.created });
});

router.post('/setup', async (req, res) => {
  if (!(await canAccessAdminSetup(req))) return res.redirect('/login');
  const { name, pin, confirm_pin } = req.body;
  if (pin !== confirm_pin) return res.redirect('/admin/setup?error=mismatch');
  await pool.query('INSERT INTO users (name, role, pin_hash) VALUES ($1,$2,$3)', [name, 'admin', hashPin(pin)]);
  await logActivity({ ...actor(req), action: 'user_created', details: `Created admin login for ${name}` });
  res.redirect(req.user ? '/admin/setup?created=1' : '/login?role=admin');
});

router.use(requireRole('admin'));

// The activity feed: every login, entry, and Setup change across the app,
// including management's own actions.
router.get('/', async (req, res) => {
  const { role, action, from, to } = req.query;
  const conditions = [];
  const params = [];
  if (role) { params.push(role); conditions.push(`role = $${params.length}`); }
  if (action) { params.push(action); conditions.push(`action = $${params.length}`); }
  if (from) { params.push(from); conditions.push(`created_at >= $${params.length}`); }
  if (to) { params.push(`${to} 23:59:59`); conditions.push(`created_at <= $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [logs, actionsRes, rolesRes] = await Promise.all([
    pool.query(`SELECT * FROM activity_log ${where} ORDER BY created_at DESC LIMIT 300`, params),
    pool.query('SELECT DISTINCT action FROM activity_log ORDER BY action'),
    pool.query(`SELECT DISTINCT role FROM activity_log WHERE role IS NOT NULL ORDER BY role`),
  ]);

  res.render('admin/index', {
    logs: logs.rows,
    actions: actionsRes.rows.map((r) => r.action),
    roles: rolesRes.rows.map((r) => r.role),
    filters: { role: role || '', action: action || '', from: from || '', to: to || '' },
  });
});

module.exports = router;
