const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// SETUP HOME - shows links to each setup area
router.get('/', (req, res) => {
  res.render('setup/index');
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
  res.render('setup/crews', {
    crews: crews.rows, workers: workers.rows, activities: activities.rows, members: members.rows
  });
});

router.post('/crews', async (req, res) => {
  const { name, activity_id } = req.body;
  await pool.query('INSERT INTO crews (name, activity_id) VALUES ($1,$2)', [name, activity_id]);
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
