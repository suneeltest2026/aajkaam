const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyPin } = require('../db/pin');
const { startSession, endSession } = require('../middleware/auth');
const { logActivity } = require('../db/activity');

const ROLE_HOME = { worker: '/worker', supervisor: '/entry', management: '/management', admin: '/admin' };

// Step 1 (no role chosen yet) or step 2 (role chosen, pick your name)
router.get('/login', async (req, res) => {
  const { role } = req.query;

  const totalUsers = await pool.query('SELECT COUNT(*)::int AS n FROM users');
  if (totalUsers.rows[0].n === 0) {
    return res.render('login/bootstrap');
  }

  if (!role || !ROLE_HOME[role]) {
    return res.render('login/role-picker');
  }

  const accounts = await pool.query(
    'SELECT id, name FROM users WHERE role = $1 AND is_active = TRUE ORDER BY name',
    [role]
  );
  res.render('login/pick-account', { role, accounts: accounts.rows, error: req.query.error });
});

// Step 3: PIN entry for the chosen account
router.get('/login/pin', async (req, res) => {
  const { role, user } = req.query;
  if (!role || !ROLE_HOME[role] || !user) return res.redirect('/login');
  const result = await pool.query(
    'SELECT id, name FROM users WHERE id = $1 AND role = $2 AND is_active = TRUE',
    [user, role]
  );
  if (!result.rows.length) return res.redirect('/login');
  res.render('login/pin', { role, account: result.rows[0], error: req.query.error });
});

router.post('/login/verify', async (req, res) => {
  const { role, user_id, pin } = req.body;
  if (!role || !ROLE_HOME[role] || !user_id) return res.redirect('/login');

  const result = await pool.query(
    'SELECT id, name, role, pin_hash FROM users WHERE id = $1 AND role = $2 AND is_active = TRUE',
    [user_id, role]
  );
  const account = result.rows[0];
  if (!account || !verifyPin(pin || '', account.pin_hash)) {
    // Never log the PIN itself — only that an attempt failed.
    await logActivity({
      userId: account ? account.id : null,
      userName: account ? account.name : `user #${user_id}`,
      role,
      action: 'login_failed',
    });
    return res.redirect(`/login/pin?role=${role}&user=${user_id}&error=1`);
  }

  startSession(res, account);
  await logActivity({ userId: account.id, userName: account.name, role: account.role, action: 'login' });
  res.redirect(ROLE_HOME[role]);
});

router.post('/logout', async (req, res) => {
  if (req.user) {
    await logActivity({ userId: req.user.id, userName: req.user.name, role: req.user.role, action: 'logout' });
  }
  endSession(res);
  res.redirect('/login');
});

module.exports = router;
