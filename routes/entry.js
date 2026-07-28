const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');

router.use(requireRole('supervisor', 'management'));

// Show the daily entry form
router.get('/', async (req, res) => {
  const crews = await pool.query(`
    SELECT c.*, a.name AS activity_name FROM crews c
    JOIN activities a ON a.id = c.activity_id ORDER BY c.name
  `);
  const projects = await pool.query('SELECT * FROM projects WHERE is_active = TRUE ORDER BY name');
  res.render('entry/form', {
    crews: crews.rows,
    projects: projects.rows,
    today: new Date().toISOString().slice(0, 10),
    saved: req.query.saved,
    enteredByName: req.user.name,
  });
});

// When a crew + activity is picked, show its stages so supervisor can enter units per stage
router.get('/stages/:crewId', async (req, res) => {
  const { crewId } = req.params;
  const crew = await pool.query(`
    SELECT c.*, a.id AS activity_id FROM crews c
    JOIN activities a ON a.id = c.activity_id
    WHERE c.id = $1
  `, [crewId]);
  if (crew.rows.length === 0) return res.json([]);
  const stages = await pool.query(
    'SELECT * FROM activity_stages WHERE activity_id = $1 ORDER BY sequence_order',
    [crew.rows[0].activity_id]
  );
  res.json(stages.rows);
});

// Save a day's entries (one row per stage worked on)
router.post('/', async (req, res) => {
  const { entry_date, project_id, crew_id, stage_ids, units, hours } = req.body;

  // stage_ids/units/hours arrive as arrays (one item per stage row on the form)
  const stageIdList = Array.isArray(stage_ids) ? stage_ids : [stage_ids];
  const unitsList = Array.isArray(units) ? units : [units];
  const hoursList = Array.isArray(hours) ? hours : [hours];

  // entered_by always comes from the logged-in session, never the form —
  // that's what makes "supervisor sees only their own entries" trustworthy.
  for (let i = 0; i < stageIdList.length; i++) {
    if (!unitsList[i]) continue; // skip stages left blank that day
    await pool.query(
      `INSERT INTO daily_entries (entry_date, project_id, crew_id, activity_stage_id, units_completed, hours_worked, entered_by, entered_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [entry_date, project_id, crew_id, stageIdList[i], unitsList[i], hoursList[i] || null, req.user.name, req.user.id]
    );
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
    SELECT de.entry_date, p.name AS project_name, c.name AS crew_name,
           a.name AS activity_name, s.name AS stage_name,
           de.units_completed, de.hours_worked, de.entered_by
    FROM daily_entries de
    LEFT JOIN projects p ON p.id = de.project_id
    LEFT JOIN crews c ON c.id = de.crew_id
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

  const header = ['Date', 'Project', 'Crew', 'Activity', 'Stage', 'Units Completed', 'Hours Worked', 'Entered By'];
  const rows = entries.rows.map(e => [
    e.entry_date.toISOString().slice(0, 10),
    e.project_name, e.crew_name, e.activity_name, e.stage_name,
    e.units_completed, e.hours_worked, e.entered_by
  ].map(escapeCsv).join(','));

  const csv = [header.join(','), ...rows].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="aajkaam-daily-entries.csv"');
  res.send(String.fromCharCode(0xFEFF) + csv);
});

module.exports = router;
