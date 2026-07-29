const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { hashPin } = require('../db/pin');
const { logActivity } = require('../db/activity');

// Setup is Management/admin-only, with one bootstrap exception: when the
// system has no logins at all yet, /setup/users stays open just long
// enough to create the first Management account.
router.use(async (req, res, next) => {
  if (req.user && (req.user.role === 'management' || req.user.role === 'admin')) return next();
  if (req.path === '/users' || req.path.startsWith('/users')) {
    const count = await pool.query('SELECT COUNT(*)::int AS n FROM users');
    if (count.rows[0].n === 0) return next();
  }
  return res.redirect('/login');
});

// SETUP HOME - shows links to each setup area
router.get('/', (req, res) => {
  res.render('setup/index');
});

// --- USERS (login accounts) ---
// Admin accounts are deliberately invisible here, even to management —
// they're created and managed only from the separate, unlinked /admin
// setup page. This list, and every action below, only ever touches
// non-admin accounts.
router.get('/users', async (req, res) => {
  const users = await pool.query(`
    SELECT u.id, u.name, u.role, u.worker_id, u.is_active, u.project_id, p.name AS project_name
    FROM users u LEFT JOIN projects p ON p.id = u.project_id
    WHERE u.role != 'admin' ORDER BY u.role, u.name
  `);
  const availableWorkers = await pool.query(`
    SELECT w.id, w.name FROM workers w
    LEFT JOIN users u ON u.worker_id = w.id
    WHERE u.id IS NULL AND w.is_active = TRUE
    ORDER BY w.name
  `);
  const projects = await pool.query('SELECT * FROM projects WHERE is_active = TRUE ORDER BY name');
  res.render('setup/users', { users: users.rows, availableWorkers: availableWorkers.rows, projects: projects.rows, error: req.query.error });
});

// Who performed the action, for the activity log — null during the one-time
// bootstrap flow, when nobody is logged in yet.
function actor(req) {
  return req.user
    ? { userId: req.user.id, userName: req.user.name, role: req.user.role }
    : { userId: null, userName: 'System (bootstrap)', role: null };
}

router.post('/users/management', async (req, res) => {
  const { name, pin, confirm_pin } = req.body;
  if (pin !== confirm_pin) return res.redirect('/setup/users?error=mismatch');
  await pool.query('INSERT INTO users (name, role, pin_hash) VALUES ($1,$2,$3)', [name, 'management', hashPin(pin)]);
  await logActivity({ ...actor(req), action: 'user_created', details: `Created management login for ${name}` });
  res.redirect('/setup/users');
});

router.post('/users/supervisor', async (req, res) => {
  const { name, pin, confirm_pin } = req.body;
  if (pin !== confirm_pin) return res.redirect('/setup/users?error=mismatch');
  await pool.query('INSERT INTO users (name, role, pin_hash) VALUES ($1,$2,$3)', [name, 'supervisor', hashPin(pin)]);
  await logActivity({ ...actor(req), action: 'user_created', details: `Created supervisor login for ${name}` });
  res.redirect('/setup/users');
});

router.post('/users/worker', async (req, res) => {
  const { worker_id, pin, confirm_pin } = req.body;
  if (pin !== confirm_pin) return res.redirect('/setup/users?error=mismatch');
  const worker = await pool.query('SELECT name FROM workers WHERE id = $1', [worker_id]);
  if (!worker.rows.length) return res.redirect('/setup/users');
  await pool.query(
    'INSERT INTO users (name, role, worker_id, pin_hash) VALUES ($1,$2,$3,$4)',
    [worker.rows[0].name, 'worker', worker_id, hashPin(pin)]
  );
  await logActivity({ ...actor(req), action: 'user_created', details: `Created worker login for ${worker.rows[0].name}` });
  res.redirect('/setup/users');
});

router.post('/users/:id/reset-pin', async (req, res) => {
  const { pin, confirm_pin } = req.body;
  if (pin !== confirm_pin) return res.redirect('/setup/users?error=mismatch');
  const target = await pool.query('SELECT name, role FROM users WHERE id = $1', [req.params.id]);
  // Management can't touch an admin account even by guessing its id.
  if (!target.rows.length || (target.rows[0].role === 'admin' && req.user.role !== 'admin')) {
    return res.redirect('/setup/users');
  }
  await pool.query('UPDATE users SET pin_hash = $1 WHERE id = $2', [hashPin(pin), req.params.id]);
  await logActivity({ ...actor(req), action: 'pin_reset', details: `Reset PIN for ${target.rows[0].name} (${target.rows[0].role})` });
  res.redirect('/setup/users');
});

router.post('/users/:id/toggle-active', async (req, res) => {
  const target = await pool.query('SELECT name, role, is_active FROM users WHERE id = $1', [req.params.id]);
  if (!target.rows.length || (target.rows[0].role === 'admin' && req.user.role !== 'admin')) {
    return res.redirect('/setup/users');
  }
  await pool.query('UPDATE users SET is_active = NOT is_active WHERE id = $1', [req.params.id]);
  const willBeActive = !target.rows[0].is_active;
  await logActivity({
    ...actor(req),
    action: willBeActive ? 'user_reactivated' : 'user_deactivated',
    details: `${target.rows[0].name} (${target.rows[0].role})`,
  });
  res.redirect('/setup/users');
});

// Tags a supervisor login directly to a project — this is the real access
// control: a supervisor can log entries for any worker tagged to the same
// project (see allowedWorkerIds in routes/entry.js), and it's shown on
// their Daily Entry screen.
router.post('/users/:id/link-project', async (req, res) => {
  const { project_id } = req.body;
  const target = await pool.query('SELECT name, role FROM users WHERE id = $1', [req.params.id]);
  if (!target.rows.length || target.rows[0].role !== 'supervisor') return res.redirect('/setup/users');
  const project = project_id ? await pool.query('SELECT name FROM projects WHERE id = $1', [project_id]) : { rows: [] };
  await pool.query('UPDATE users SET project_id = $1 WHERE id = $2', [project_id || null, req.params.id]);
  await logActivity({
    ...actor(req), action: 'supervisor_linked_to_project',
    details: project_id
      ? `${target.rows[0].name} → ${project.rows[0] ? project.rows[0].name : 'project #' + project_id}`
      : `${target.rows[0].name} unlinked from project`,
  });
  res.redirect('/setup/users');
});

// --- TRADES ---
router.get('/trades', async (req, res) => {
  const result = await pool.query('SELECT * FROM trades ORDER BY name');
  const skillLevels = await pool.query('SELECT * FROM skill_levels ORDER BY name');
  res.render('setup/trades', { trades: result.rows, skillLevels: skillLevels.rows });
});

router.post('/trades', async (req, res) => {
  const { name } = req.body;
  await pool.query('INSERT INTO trades (name) VALUES ($1)', [name]);
  res.redirect('/setup/trades');
});

router.post('/skill-levels', async (req, res) => {
  const { name } = req.body;
  await pool.query('INSERT INTO skill_levels (name) VALUES ($1)', [name]);
  res.redirect('/setup/trades');
});

// --- WORKERS ---
router.get('/workers', async (req, res) => {
  const workers = await pool.query(`
    SELECT w.*, t.name AS trade_name, sl.name AS skill_level_name, p.name AS project_name
    FROM workers w
    LEFT JOIN trades t ON t.id = w.trade_id
    LEFT JOIN skill_levels sl ON sl.id = w.skill_level_id
    LEFT JOIN projects p ON p.id = w.project_id
    WHERE w.is_active = TRUE ORDER BY w.name
  `);
  const trades = await pool.query('SELECT * FROM trades ORDER BY name');
  const skillLevels = await pool.query('SELECT * FROM skill_levels ORDER BY name');
  const projects = await pool.query('SELECT * FROM projects WHERE is_active = TRUE ORDER BY name');
  res.render('setup/workers', { workers: workers.rows, trades: trades.rows, skillLevels: skillLevels.rows, projects: projects.rows });
});

router.post('/workers', async (req, res) => {
  const { name, trade_id, skill_level_id } = req.body;
  await pool.query(
    'INSERT INTO workers (name, trade_id, skill_level_id) VALUES ($1,$2,$3)',
    [name, trade_id || null, skill_level_id || null]
  );
  res.redirect('/setup/workers');
});

// Tags a worker directly to a project — this is the real access control:
// only a supervisor tagged to the same project can log entries for this
// worker, and it's shown on the worker's own dashboard.
router.post('/workers/:id/link-project', async (req, res) => {
  const { project_id } = req.body;
  const [worker, project] = await Promise.all([
    pool.query('SELECT name FROM workers WHERE id = $1', [req.params.id]),
    project_id ? pool.query('SELECT name FROM projects WHERE id = $1', [project_id]) : Promise.resolve({ rows: [] }),
  ]);
  await pool.query('UPDATE workers SET project_id = $1 WHERE id = $2', [project_id || null, req.params.id]);
  if (worker.rows.length) {
    await logActivity({
      ...actor(req), action: 'worker_linked_to_project',
      details: project_id
        ? `${worker.rows[0].name} → ${project.rows[0] ? project.rows[0].name : 'project #' + project_id}`
        : `${worker.rows[0].name} unlinked from project`,
    });
  }
  res.redirect('/setup/workers');
});

// --- PROJECT TYPES ---
router.post('/project-types', async (req, res) => {
  const { name } = req.body;
  await pool.query('INSERT INTO project_types (name) VALUES ($1)', [name]);
  res.redirect('/setup/projects');
});

// --- PROJECTS ---
router.get('/projects', async (req, res) => {
  const projects = await pool.query(`
    SELECT p.*, pt.name AS project_type_name
    FROM projects p LEFT JOIN project_types pt ON pt.id = p.project_type_id
    WHERE p.is_active = TRUE ORDER BY p.name
  `);
  const projectTypes = await pool.query('SELECT * FROM project_types ORDER BY name');
  res.render('setup/projects', { projects: projects.rows, projectTypes: projectTypes.rows });
});

router.post('/projects', async (req, res) => {
  const { name, location, project_type_id } = req.body;
  await pool.query(
    'INSERT INTO projects (name, location, project_type_id) VALUES ($1,$2,$3)',
    [name, location || null, project_type_id || null]
  );
  res.redirect('/setup/projects');
});

// --- ACTIVITIES + STAGES ---
router.get('/activities', async (req, res) => {
  const activities = await pool.query('SELECT * FROM activities ORDER BY name');
  const stages = await pool.query(`
    SELECT s.*, a.name AS activity_name
    FROM activity_stages s
    JOIN activities a ON a.id = s.activity_id
    ORDER BY a.name, s.sequence_order
  `);
  res.render('setup/activities', { activities: activities.rows, stages: stages.rows });
});

router.post('/activities', async (req, res) => {
  const { name, unit } = req.body;
  await pool.query('INSERT INTO activities (name, unit) VALUES ($1, $2)', [name, unit || 'sqm']);
  res.redirect('/setup/activities');
});

router.post('/activities/:id/stages', async (req, res) => {
  const { id } = req.params;
  const { stage_name, weight_percent, sequence_order } = req.body;
  await pool.query(
    'INSERT INTO activity_stages (activity_id, name, weight_percent, sequence_order) VALUES ($1,$2,$3,$4)',
    [id, stage_name, weight_percent, sequence_order]
  );
  res.redirect('/setup/activities');
});

// --- TARGETS ---
router.get('/targets', async (req, res) => {
  const targets = await pool.query(`
    SELECT t.*, s.name AS stage_name, a.name AS activity_name, p.name AS project_type_name
    FROM targets t
    JOIN activity_stages s ON s.id = t.stage_id
    JOIN activities a ON a.id = t.activity_id
    LEFT JOIN project_types p ON p.id = t.project_type_id
    ORDER BY a.name, s.sequence_order
  `);
  const stages = await pool.query(`
    SELECT s.*, a.name as activity_name FROM activity_stages s
    JOIN activities a ON a.id = s.activity_id ORDER BY a.name, s.sequence_order
  `);
  const projectTypes = await pool.query('SELECT * FROM project_types ORDER BY name');
  res.render('setup/targets', { targets: targets.rows, stages: stages.rows, projectTypes: projectTypes.rows });
});

router.post('/targets', async (req, res) => {
  const { activity_id, stage_id, project_type_id, target_per_day } = req.body;
  const isGeneral = !project_type_id;
  await pool.query(
    `INSERT INTO targets (activity_id, stage_id, project_type_id, target_per_day, is_general_default)
     VALUES ($1,$2,$3,$4,$5)`,
    [activity_id, stage_id, project_type_id || null, target_per_day, isGeneral]
  );
  res.redirect('/setup/targets');
});

module.exports = router;
