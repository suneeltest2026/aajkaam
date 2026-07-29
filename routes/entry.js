const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');
const { logActivity } = require('../db/activity');

router.use(requireRole('supervisor', 'management', 'admin'));

// Which workers a user may log entries for. Management/admin can log for
// any worker; a supervisor is limited to workers tagged to the same
// project they're tagged to in Setup -> Users. Returns null for "no
// restriction", otherwise an array of worker ids.
async function allowedWorkerIds(user) {
  if (user.role === 'management' || user.role === 'admin') return null;
  const sup = await pool.query('SELECT project_id FROM users WHERE id = $1', [user.id]);
  const projectId = sup.rows[0] && sup.rows[0].project_id;
  if (!projectId) return []; // not tagged to a project yet — nobody to log for
  const result = await pool.query('SELECT id FROM workers WHERE project_id = $1 AND is_active = TRUE', [projectId]);
  return result.rows.map((r) => r.id);
}

// Show the daily entry form
router.get('/', async (req, res) => {
  const allowed = await allowedWorkerIds(req.user);
  const workers = await pool.query(
    allowed
      ? `SELECT w.*, t.name AS trade_name, p.name AS project_name FROM workers w
         LEFT JOIN trades t ON t.id = w.trade_id LEFT JOIN projects p ON p.id = w.project_id
         WHERE w.id = ANY($1) ORDER BY w.name`
      : `SELECT w.*, t.name AS trade_name, p.name AS project_name FROM workers w
         LEFT JOIN trades t ON t.id = w.trade_id LEFT JOIN projects p ON p.id = w.project_id
         WHERE w.is_active = TRUE ORDER BY w.name`,
    allowed ? [allowed] : []
  );
  const activities = await pool.query('SELECT * FROM activities ORDER BY name');

  // The supervisor's own project tag, shown so it's clear which project
  // "their" workers list is scoped to.
  const tagged = await pool.query(
    `SELECT p.name, p.location FROM users u LEFT JOIN projects p ON p.id = u.project_id WHERE u.id = $1`,
    [req.user.id]
  );

  res.render('entry/form', {
    workers: workers.rows,
    activities: activities.rows,
    taggedProject: tagged.rows[0] && tagged.rows[0].name ? tagged.rows[0] : null,
    today: new Date().toISOString().slice(0, 10),
    saved: req.query.saved,
    error: req.query.error,
    enteredByName: req.user.name,
  });
});

// When an activity is picked, show its stages so the supervisor can enter
// units per stage.
router.get('/stages/:activityId', async (req, res) => {
  const stages = await pool.query(
    'SELECT * FROM activity_stages WHERE activity_id = $1 ORDER BY sequence_order',
    [req.params.activityId]
  );
  res.json(stages.rows);
});

// When a worker is picked, show which project the entry will be logged
// against — always that worker's own tagged project, never a separate pick.
router.get('/worker-project/:workerId', async (req, res) => {
  const allowed = await allowedWorkerIds(req.user);
  if (allowed && !allowed.includes(Number(req.params.workerId))) return res.json({ project: null });
  const result = await pool.query(
    `SELECT p.name, p.location FROM workers w LEFT JOIN projects p ON p.id = w.project_id WHERE w.id = $1`,
    [req.params.workerId]
  );
  const row = result.rows[0];
  res.json({ project: row && row.name ? row : null });
});

// Save a day's entries (one row per stage worked on)
router.post('/', async (req, res) => {
  const { entry_date, worker_id, stage_ids, units, hours } = req.body;

  // The worker dropdown is already filtered client-side, but a supervisor
  // could still POST an arbitrary worker_id directly — check for real here.
  const allowed = await allowedWorkerIds(req.user);
  if (allowed && !allowed.includes(Number(worker_id))) {
    return res.redirect('/entry?error=worker');
  }

  // The project is never taken from the form — it's whatever project the
  // worker is currently tagged to, looked up fresh here.
  const workerRow = await pool.query('SELECT name, project_id FROM workers WHERE id = $1', [worker_id]);
  if (!workerRow.rows.length) return res.redirect('/entry?error=worker');
  const project_id = workerRow.rows[0].project_id;

  // stage_ids/units/hours arrive as arrays (one item per stage row on the form)
  const stageIdList = Array.isArray(stage_ids) ? stage_ids : [stage_ids];
  const unitsList = Array.isArray(units) ? units : [units];
  const hoursList = Array.isArray(hours) ? hours : [hours];

  // entered_by always comes from the logged-in session, never the form —
  // that's what makes "supervisor sees only their own entries" trustworthy.
  let savedCount = 0;
  for (let i = 0; i < stageIdList.length; i++) {
    if (!unitsList[i]) continue; // skip stages left blank that day
    await pool.query(
      `INSERT INTO daily_entries (entry_date, project_id, worker_id, activity_stage_id, units_completed, hours_worked, entered_by, entered_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [entry_date, project_id, worker_id, stageIdList[i], unitsList[i], hoursList[i] || null, req.user.name, req.user.id]
    );
    savedCount++;
  }
  if (savedCount > 0) {
    await logActivity({
      userId: req.user.id, userName: req.user.name, role: req.user.role,
      action: 'entry_created',
      details: `${savedCount} stage(s) for ${workerRow.rows[0].name} on ${entry_date}`,
    });
  }
  res.redirect('/entry?saved=1');
});

// Build the filtered daily-entries query shared by the report page and CSV export.
// A supervisor only ever sees entries they themselves made; management sees all.
function buildReportQuery(query, user) {
  const { from, to } = query;
  const conditions = [];
  const params = [];
  if (from) { params.push(from); conditions.push(`de.entry_date >= $${params.length}`); }
  if (to) { params.push(to); conditions.push(`de.entry_date <= $${params.length}`); }
  if (user.role === 'supervisor') { params.push(user.id); conditions.push(`de.entered_by_user_id = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT de.entry_date, p.name AS project_name, w.name AS worker_name,
           a.name AS activity_name, s.name AS stage_name,
           de.units_completed, de.hours_worked, de.entered_by
    FROM daily_entries de
    LEFT JOIN projects p ON p.id = de.project_id
    LEFT JOIN workers w ON w.id = de.worker_id
    LEFT JOIN activity_stages s ON s.id = de.activity_stage_id
    LEFT JOIN activities a ON a.id = s.activity_id
    ${where}
    ORDER BY de.entry_date DESC, de.id DESC
  `;
  return { sql, params };
}

// --- REPORT: view all recorded daily entries, with optional date-range filter ---
router.get('/report', async (req, res) => {
  const { from = '', to = '' } = req.query;
  const { sql, params } = buildReportQuery(req.query, req.user);
  const entries = await pool.query(sql, params);
  res.render('entry/report', { entries: entries.rows, from, to });
});

// --- EXPORT: same data as CSV, which Excel opens directly ---
router.get('/report/export.csv', async (req, res) => {
  const { sql, params } = buildReportQuery(req.query, req.user);
  const entries = await pool.query(sql, params);

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = ['Date', 'Project', 'Worker', 'Activity', 'Stage', 'Units Completed', 'Hours Worked', 'Entered By'];
  const rows = entries.rows.map(e => [
    e.entry_date.toISOString().slice(0, 10),
    e.project_name, e.worker_name, e.activity_name, e.stage_name,
    e.units_completed, e.hours_worked, e.entered_by
  ].map(escapeCsv).join(','));

  const csv = [header.join(','), ...rows].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="aajkaam-daily-entries.csv"');
  res.send(String.fromCharCode(0xFEFF) + csv);
});

module.exports = router;
