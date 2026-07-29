const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');
const { logActivity } = require('../db/activity');

router.use(requireRole('supervisor', 'management', 'admin'));

// Which crews a user may log entries for. Management/admin can log for any
// crew; a supervisor is limited to crews assigned to them in Setup -> Crews.
// Returns null for "no restriction", otherwise an array of crew ids.
async function allowedCrewIds(user) {
  if (user.role === 'management' || user.role === 'admin') return null;
  const result = await pool.query('SELECT crew_id FROM crew_supervisors WHERE user_id = $1', [user.id]);
  return result.rows.map((r) => r.crew_id);
}

// Show the daily entry form
router.get('/', async (req, res) => {
  const allowed = await allowedCrewIds(req.user);
  const crews = await pool.query(
    allowed
      ? `SELECT c.*, a.name AS activity_name, p.name AS project_name FROM crews c
         JOIN activities a ON a.id = c.activity_id LEFT JOIN projects p ON p.id = c.project_id
         WHERE c.id = ANY($1) ORDER BY c.name`
      : `SELECT c.*, a.name AS activity_name, p.name AS project_name FROM crews c
         JOIN activities a ON a.id = c.activity_id LEFT JOIN projects p ON p.id = c.project_id
         ORDER BY c.name`,
    allowed ? [allowed] : []
  );

  // The supervisor's own direct project tag (Setup -> Users), separate
  // from whichever project each individual crew below belongs to.
  const tagged = await pool.query(
    `SELECT p.name, p.location FROM users u LEFT JOIN projects p ON p.id = u.project_id WHERE u.id = $1`,
    [req.user.id]
  );

  res.render('entry/form', {
    crews: crews.rows,
    taggedProject: tagged.rows[0] && tagged.rows[0].name ? tagged.rows[0] : null,
    today: new Date().toISOString().slice(0, 10),
    saved: req.query.saved,
    error: req.query.error,
    enteredByName: req.user.name,
  });
});

// When a crew is picked, show its project + stages so the supervisor can
// enter units per stage. The crew's project is fixed — there's no separate
// project picker on this form.
router.get('/stages/:crewId', async (req, res) => {
  const { crewId } = req.params;
  const allowed = await allowedCrewIds(req.user);
  if (allowed && !allowed.includes(Number(crewId))) return res.json({ project: null, stages: [] });

  const crew = await pool.query(`
    SELECT c.*, a.id AS activity_id, p.name AS project_name FROM crews c
    JOIN activities a ON a.id = c.activity_id
    LEFT JOIN projects p ON p.id = c.project_id
    WHERE c.id = $1
  `, [crewId]);
  if (crew.rows.length === 0) return res.json({ project: null, stages: [] });
  const stages = await pool.query(
    'SELECT * FROM activity_stages WHERE activity_id = $1 ORDER BY sequence_order',
    [crew.rows[0].activity_id]
  );
  res.json({ project: { name: crew.rows[0].project_name || 'No project set' }, stages: stages.rows });
});

// Save a day's entries (one row per stage worked on)
router.post('/', async (req, res) => {
  const { entry_date, crew_id, stage_ids, units, hours } = req.body;

  // The crew dropdown is already filtered client-side, but a supervisor
  // could still POST an arbitrary crew_id directly — check for real here.
  const allowed = await allowedCrewIds(req.user);
  if (allowed && !allowed.includes(Number(crew_id))) {
    return res.redirect('/entry?error=crew');
  }

  // The project is never taken from the form — it's whatever project the
  // crew is currently assigned to, looked up fresh here.
  const crewRow = await pool.query('SELECT name, project_id FROM crews WHERE id = $1', [crew_id]);
  if (!crewRow.rows.length) return res.redirect('/entry?error=crew');
  const project_id = crewRow.rows[0].project_id;

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
      `INSERT INTO daily_entries (entry_date, project_id, crew_id, activity_stage_id, units_completed, hours_worked, entered_by, entered_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [entry_date, project_id, crew_id, stageIdList[i], unitsList[i], hoursList[i] || null, req.user.name, req.user.id]
    );
    savedCount++;
  }
  if (savedCount > 0) {
    await logActivity({
      userId: req.user.id, userName: req.user.name, role: req.user.role,
      action: 'entry_created',
      details: `${savedCount} stage(s) for '${crewRow.rows[0].name}' on ${entry_date}`,
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
