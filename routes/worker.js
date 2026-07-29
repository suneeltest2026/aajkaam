const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { getTargetForStage } = require('../db/targets');
const { requireRole } = require('../middleware/auth');

router.use(requireRole('worker'));

// No :id here on purpose — a worker only ever sees their own dashboard,
// taken from the logged-in session, never from the URL.
router.get('/', async (req, res) => {
  const id = req.user.worker_id;
  const workerRes = await pool.query(`
    SELECT w.*, t.name AS trade_name, p.name AS tagged_project_name, p.location AS tagged_project_location,
           p.project_type_id
    FROM workers w
    LEFT JOIN trades t ON t.id = w.trade_id
    LEFT JOIN projects p ON p.id = w.project_id
    WHERE w.id = $1
  `, [id]);
  if (workerRes.rows.length === 0) return res.redirect('/login');
  const worker = workerRes.rows[0];

  const entriesRes = await pool.query(`
    SELECT s.name AS stage_name, s.id AS stage_id, de.units_completed, de.hours_worked
    FROM daily_entries de
    JOIN activity_stages s ON s.id = de.activity_stage_id
    WHERE de.worker_id = $1 AND de.entry_date = CURRENT_DATE
    ORDER BY s.sequence_order
  `, [id]);

  // A stage can have more than one entry in a day (e.g. logged in two
  // batches) — group by stage first so units/hours are totalled once
  // and the target isn't counted twice.
  const byStage = new Map();
  for (const e of entriesRes.rows) {
    if (!byStage.has(e.stage_id)) {
      byStage.set(e.stage_id, { stage_name: e.stage_name, stage_id: e.stage_id, units: 0, hours: 0 });
    }
    const g = byStage.get(e.stage_id);
    g.units += parseFloat(e.units_completed);
    g.hours += parseFloat(e.hours_worked) || 0;
  }

  let totalHours = 0;
  const stages = [];
  for (const g of byStage.values()) {
    const target = await getTargetForStage(g.stage_id, worker.project_type_id);
    const percent = target ? Math.min(100, Math.round((g.units / target) * 100)) : null;
    stages.push({ stage_name: g.stage_name, units: g.units, target, percent });
    totalHours += g.hours;
  }

  res.render('worker/dashboard', {
    worker,
    stages,
    totalHours,
    loggedToday: entriesRes.rows.length > 0,
    today: new Date().toISOString().slice(0, 10),
  });
});

module.exports = router;
