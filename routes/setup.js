const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { hashPin } = require('../db/pin');

// Setup is Management-only, with one bootstrap exception: when the system
// has no logins at all yet, /setup/users stays open just long enough to
// create the first Management account.
router.use(async (req, res, next) => {
  if (req.user && req.user.role === 'management') return next();
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
router.get('/users', async (req, res) => {
  const users = await pool.query('SELECT id, name, role, worker_id, is_active FROM users ORDER BY role, name');
  const availableWorkers = await pool.query(`
    SELECT w.id, w.name FROM workers w
    LEFT JOIN users u ON u.worker_id = w.id
    WHERE u.id IS NULL AND w.is_active = TRUE
    ORDER BY w.name
  `);
  res.render('setup/users', { users: users.rows, availableWorkers: availableWorkers.rows, error: req.query.error });
});

router.post('/users/management', async (req, res) => {
  const { name, pin, confirm_pin } = req.body;
  if (pin !== confirm_pin) return res.redirect('/setup/users?error=mismatch');
  await pool.query('INSERT INTO users (name, role, pin_hash) VALUES ($1,$2,$3)', [name, 'management', hashPin(pin)]);
  res.redirect('/setup/users');
});

router.post('/users/supervisor', async (req, res) => {
  const { name, pin, confirm_pin } = req.body;
  if (pin !== confirm_pin) return res.redirect('/setup/users?error=mismatch');
  await pool.query('INSERT INTO users (name, role, pin_hash) VALUES ($1,$2,$3)', [name, 'supervisor', hashPin(pin)]);
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
  res.redirect('/setup/users');
});

router.post('/users/:id/reset-pin', async (req, res) => {
  const { pin, confirm_pin } = req.body;
  if (pin !== confirm_pin) return res.redirect('/setup/users?error=mismatch');
  await pool.query('UPDATE users SET pin_hash = $1 WHERE id = $2', [hashPin(pin), req.params.id]);
  res.redirect('/setup/users');
});

router.post('/users/:id/toggle-active', async (req, res) => {
  await pool.query('UPDATE users SET is_active = NOT is_active WHERE id = $1', [req.params.id]);
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
    SELECT w.*, t.name AS trade_name, sl.name AS skill_level_name
    FROM workers w
    LEFT JOIN trades t ON t.id = w.trade_id
    LEFT JOIN skill_levels sl ON sl.id = w.skill_level_id
    WHERE w.is_active = TRUE ORDER BY w.name
  `);
  const trades = await pool.query('SELECT * FROM trades ORDER BY name');
  const skillLevels = await pool.query('SELECT * FROM skill_levels ORDER BY name');
  res.render('setup/workers', { workers: workers.rows, trades: trades.rows, skillLevels: skillLevels.rows });
});

router.post('/workers', async (req, res) => {
  const { name, trade_id, skill_level_id } = req.body;
  await pool.query(
    'INSERT INTO workers (name, trade_id, skill_level_id) VALUES ($1,$2,$3)',
    [name, trade_id || null, skill_level_id || null]
  );
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
  const { name, project_type_id } = req.body;
  await pool.query(
    'INSERT INTO projects (name, project_type_id) VALUES ($1,$2)',
    [name, project_type_id || null]
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

// --- CREWS ---
router.get('/crews', async (req, res) => {
  const crews = await pool.query(`
    SELECT c.*, a.name AS activity_name
    FROM crews c LEFT JOIN activities a ON a.id = c.activity_id
    ORDER BY c.name
  `);
  const workers = await pool.query('SELECT * FROM workers WHERE is_active = TRUE ORDER BY name');
  const activities = await pool.query('SELECT * FROM activities ORDER BY name');
  const members = await pool.query(`
    SELECT cm.*, w.name AS worker_name, c.name AS crew_name
    FROM crew_members cm
    JOIN workers w ON w.id = cm.worker_id
    JOIN crews c ON c.id = cm.crew_id
  `);
  const supervisors = await pool.query(`SELECT id, name FROM users WHERE role = 'supervisor' AND is_active = TRUE ORDER BY name`);
  const crewSupervisors = await pool.query(`
    SELECT cs.id, cs.crew_id, u.id AS user_id, u.name AS supervisor_name
    FROM crew_supervisors cs JOIN users u ON u.id = cs.user_id
  `);
  res.render('setup/crews', {
    crews: crews.rows, workers: workers.rows, activities: activities.rows, members: members.rows,
    supervisors: supervisors.rows, crewSupervisors: crewSupervisors.rows,
  });
});

router.post('/crews', async (req, res) => {
  const { name, activity_id } = req.body;
  await pool.query('INSERT INTO crews (name, activity_id) VALUES ($1,$2)', [name, activity_id]);
  res.redirect('/setup/crews');
});

router.post('/crews/:id/supervisors', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  await pool.query(
    'INSERT INTO crew_supervisors (crew_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [id, user_id]
  );
  res.redirect('/setup/crews');
});

router.post('/crews/:crewId/supervisors/:userId/remove', async (req, res) => {
  const { crewId, userId } = req.params;
  await pool.query('DELETE FROM crew_supervisors WHERE crew_id = $1 AND user_id = $2', [crewId, userId]);
  res.redirect('/setup/crews');
});

router.post('/crews/:id/members', async (req, res) => {
  const { id } = req.params;
  const { worker_id, incentive_share_percent } = req.body;
  await pool.query(
    'INSERT INTO crew_members (crew_id, worker_id, incentive_share_percent) VALUES ($1,$2,$3)',
    [id, worker_id, incentive_share_percent]
  );
  res.redirect('/setup/crews');
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
