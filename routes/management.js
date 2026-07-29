const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { getTargetForStage } = require('../db/targets');
const { requireRole } = require('../middleware/auth');

router.use(requireRole('management', 'admin'));

// A stage can have more than one entry in a day, so group by stage first —
// otherwise a repeated stage would count its target twice and understate
// the project's real completion %.
async function projectDayAggregate(projectId, dateStr) {
  const rows = await pool.query(`
    SELECT s.id AS stage_id, SUM(de.units_completed) AS units, p.project_type_id
    FROM daily_entries de
    JOIN activity_stages s ON s.id = de.activity_stage_id
    LEFT JOIN projects p ON p.id = de.project_id
    WHERE de.project_id = $1 AND de.entry_date = $2
    GROUP BY s.id, p.project_type_id
  `, [projectId, dateStr]);

  let sumUnits = 0, sumTarget = 0;
  for (const row of rows.rows) {
    const target = await getTargetForStage(row.stage_id, row.project_type_id);
    if (target) { sumUnits += parseFloat(row.units); sumTarget += target; }
  }
  return { hasEntries: rows.rows.length > 0, sumUnits, sumTarget };
}

// Per project: how many supervisors and workers are tagged to it. Any
// supervisor on a project can log for any worker on that same project —
// there's no finer-grained pairing than that now, so this is two flat
// lists rather than a supervisor -> their-workers tree.
async function projectTeamBreakdown() {
  const [projectsRes, supervisorsRes, workersRes] = await Promise.all([
    pool.query('SELECT id, name FROM projects WHERE is_active = TRUE ORDER BY name'),
    pool.query(`SELECT id, name, project_id FROM users WHERE role = 'supervisor' AND is_active = TRUE`),
    pool.query('SELECT id, name, project_id FROM workers WHERE is_active = TRUE'),
  ]);

  return projectsRes.rows.map((project) => {
    const supervisors = supervisorsRes.rows.filter((s) => s.project_id === project.id);
    const workers = workersRes.rows.filter((w) => w.project_id === project.id);
    return {
      name: project.name,
      supervisors: supervisors.map((s) => s.name).sort(),
      workers: workers.map((w) => w.name).sort(),
    };
  });
}

// For a given date, look at every project that logged work and say how
// many hit >=85% of their combined stage target ("on target").
async function projectTargetSummary(dateStr) {
  const projectsRes = await pool.query(
    'SELECT DISTINCT project_id FROM daily_entries WHERE entry_date = $1 AND project_id IS NOT NULL',
    [dateStr]
  );
  let onTarget = 0;
  for (const { project_id } of projectsRes.rows) {
    const { sumUnits, sumTarget } = await projectDayAggregate(project_id, dateStr);
    if (sumTarget > 0 && sumUnits / sumTarget >= 0.85) onTarget++;
  }
  return { totalProjects: projectsRes.rows.length, onTarget };
}

function formatShortDate(dateStr, todayStr) {
  const label = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  return dateStr === todayStr ? `${label} (today)` : label;
}

router.get('/', async (req, res) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const [activeSites, activeWorkers, entriesToday, entriesYesterday, todaySummary, yesterdaySummary, projectsRes, dailyRes, projectTeams] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS n FROM projects WHERE is_active = TRUE'),
    pool.query('SELECT COUNT(*)::int AS n FROM workers WHERE is_active = TRUE'),
    pool.query('SELECT COUNT(*)::int AS n FROM daily_entries WHERE entry_date = $1', [todayStr]),
    pool.query('SELECT COUNT(*)::int AS n FROM daily_entries WHERE entry_date = $1', [yesterdayStr]),
    projectTargetSummary(todayStr),
    projectTargetSummary(yesterdayStr),
    pool.query(`
      SELECT p.id, p.name, p.location,
        (SELECT COUNT(*)::int FROM workers w WHERE w.project_id = p.id AND w.is_active = TRUE) AS worker_count
      FROM projects p WHERE p.is_active = TRUE ORDER BY p.name
    `),
    pool.query(`
      SELECT entry_date::text AS d, SUM(units_completed) AS total
      FROM daily_entries
      WHERE entry_date >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY entry_date ORDER BY entry_date
    `),
    projectTeamBreakdown(),
  ]);

  const projects = [];
  for (const project of projectsRes.rows) {
    const { hasEntries, sumUnits, sumTarget } = await projectDayAggregate(project.id, todayStr);

    let status = 'none';
    let percent = null;
    if (!hasEntries) status = 'none';
    else if (sumTarget === 0) status = 'no-target';
    else {
      percent = Math.round((sumUnits / sumTarget) * 100);
      status = percent >= 85 ? 'good' : percent >= 60 ? 'warn' : 'bad';
    }

    projects.push({
      name: project.name,
      location: project.location,
      worker_count: project.worker_count,
      percent,
      status,
    });
  }

  const dailyRows = dailyRes.rows.map(r => ({ date: r.d, total: parseFloat(r.total) }));
  let chart = null;
  if (dailyRows.length >= 2) {
    const w = 220, h = 64, padTop = 6, padBottom = 8;
    const values = dailyRows.map(r => r.total);
    const max = Math.max(...values), min = Math.min(...values);
    const range = max - min || 1;
    const stepX = w / (dailyRows.length - 1);
    const points = dailyRows.map((r, i) => ({
      x: Math.round(i * stepX),
      y: Math.round(padTop + (1 - (r.total - min) / range) * (h - padTop - padBottom)),
    }));
    const linePoints = points.map(p => `${p.x},${p.y}`).join(' ');
    chart = {
      w, h,
      linePoints,
      areaPoints: `${linePoints} ${w},${h} 0,${h}`,
      end: points[points.length - 1],
      firstLabel: formatShortDate(dailyRows[0].date, todayStr),
      lastLabel: formatShortDate(dailyRows[dailyRows.length - 1].date, todayStr),
    };
  }

  const projectsOnTargetPct = todaySummary.totalProjects ? Math.round((todaySummary.onTarget / todaySummary.totalProjects) * 100) : null;
  const yesterdayPct = yesterdaySummary.totalProjects ? Math.round((yesterdaySummary.onTarget / yesterdaySummary.totalProjects) * 100) : null;
  const projectsOnTargetDelta = (projectsOnTargetPct !== null && yesterdayPct !== null) ? projectsOnTargetPct - yesterdayPct : null;
  const entriesDelta = entriesToday.rows[0].n - entriesYesterday.rows[0].n;

  res.render('management/index', {
    activeSites: activeSites.rows[0].n,
    activeWorkers: activeWorkers.rows[0].n,
    entriesToday: entriesToday.rows[0].n,
    entriesDelta,
    projectsOnTargetPct,
    projectsOnTargetDelta,
    projects,
    chart,
    projectTeams,
  });
});

module.exports = router;
