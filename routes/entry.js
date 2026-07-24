const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Show the daily entry form
router.get('/', async (req, res) => {
  const crews = await pool.query(`
    SELECT c.*, a.name AS activity_name FROM crews c
    JOIN activities a ON a.id = c.activity_id ORDER BY c.name
  `);
  const projects = await pool.query('SELECT * FROM projects WHERE is_active = TRUE ORDER BY name');
  res.render('entry/form', { crews: crews.rows, projects: projects.rows, today: new Date().toISOString().slice(0,10) });
});

// When a crew + activity is picked, show its stages so supervisor can enter units per stage
router.get('/stages/:crewId', async (req, res) => {
  const { crewId } = req.params;
  const crew = await pool.query(`
    SELECT c.*, a.id AS activity_id FROM crews c WHERE c.id = $1
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
  const { entry_date, project_id, crew_id, entered_by, stage_ids, units, hours } = req.body;

  // stage_ids/units/hours arrive as arrays (one item per stage row on the form)
  const stageIdList = Array.isArray(stage_ids) ? stage_ids : [stage_ids];
  const unitsList = Array.isArray(units) ? units : [units];
  const hoursList = Array.isArray(hours) ? hours : [hours];

  for (let i = 0; i < stageIdList.length; i++) {
    if (!unitsList[i]) continue; // skip stages left blank that day
    await pool.query(
      `INSERT INTO daily_entries (entry_date, project_id, crew_id, activity_stage_id, units_completed, hours_worked, entered_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [entry_date, project_id, crew_id, stageIdList[i], unitsList[i], hoursList[i] || null, entered_by]
    );
  }
  res.redirect('/entry?saved=1');
});

module.exports = router;
