const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { getTargetForStage } = require('../db/targets');

// A stage can have more than one entry in a day, so group by stage first —
// otherwise a repeated stage would count its target twice and understate
// the crew's real completion %.
async function crewDayAggregate(crewId, dateStr) {
  const rows = await pool.query(`
    SELECT s.id AS stage_id, SUM(de.units_completed) AS units, p.project_type_id,
           MIN(p.name) AS project_name
    FROM daily_entries de
    JOIN activity_stages s ON s.id = de.activity_stage_id
    LEFT JOIN projects p ON p.id = de.project_id
    WHERE de.crew_id = $1 AND de.entry_date = $2
    GROUP BY s.id, p.project_type_id
  `, [crewId, dateStr]);

  let sumUnits = 0, sumTarget = 0, projectName = null;
  for (const row of rows.rows) {
    if (!projectName) projectName = row.project_name;
    const target = await getTargetForStage(row.stage_id, row.project_type_id);
    if (target) { sumUnits += parseFloat(row.units); sumTarget += target; }
  }
  return { hasEntries: rows.rows.length > 0, sumUnits, sumTarget, projectName };
}

// For a given date, look at every crew that logged work and say how many
// hit >=85% of their combined stage target ("on target").
async function crewTargetSummary(dateStr) {
  const crewsRes = await pool.query(
    'SELECT DISTINCT crew_id FROM daily_entries WHERE entry_date = $1',
    [dateStr]
  );
  let onTarget = 0;
  for (const { crew_id } of crewsRes.rows) {
    const { sumUnits, sumTarget } = await crewDayAggregate(crew_id, dateStr);
    if (sumTarget > 0 && sumUnits / sumTarget >= 0.85) onTarget++;
  }
  return { totalCrews: crewsRes.rows.length, onTarget };
}

function formatShortDate(dateStr, todayStr) {
  const label = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  return dateStr === todayStr ? `${label} (today)` : label;
}

router.get('/', async (req, res) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const [activeSites, activeWorkers, entriesToday, entriesYesterday, todaySummary, yesterdaySummary, crewsRes, dailyRes] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS n FROM projects WHERE is_active = TRUE'),
    pool.query('SELECT COUNT(*)::int AS n FROM workers WHERE is_active = TRUE'),
    pool.query('SELECT COUNT(*)::int AS n FROM daily_entries WHERE entry_date = $1', [todayStr]),
    pool.query('SELECT COUNT(*)::int AS n FROM daily_entries WHERE entry_date = $1', [yesterdayStr]),
    crewTargetSummary(todayStr),
    crewTargetSummary(yesterdayStr),
    pool.query(`
      SELECT c.id, c.name, a.name AS activity_name,
        (SELECT COUNT(*)::int FROM crew_members cm WHERE cm.crew_id = c.id) AS member_count
      FROM crews c JOIN activities a ON a.id = c.activity_id
      ORDER BY c.name
    `),
    pool.query(`
      SELECT entry_date::text AS d, SUM(units_completed) AS total
      FROM daily_entries
      WHERE entry_date >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY entry_date ORDER BY entry_date
    `),
  ]);

  const crews = [];
  for (const crew of crewsRes.rows) {
    const { hasEntries, sumUnits, sumTarget, projectName } = await crewDayAggregate(crew.id, todayStr);

    let status = 'none';
    let percent = null;
    if (!hasEntries) status = 'none';
    else if (sumTarget === 0) status = 'no-target';
    else {
      percent = Math.round((sumUnits / sumTarget) * 100);
      status = percent >= 85 ? 'good' : percent >= 60 ? 'warn' : 'bad';
    }

    crews.push({
      name: crew.name,
      activity_name: crew.activity_name,
      member_count: crew.member_count,
      projectName,
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

  const crewsOnTargetPct = todaySummary.totalCrews ? Math.round((todaySummary.onTarget / todaySummary.totalCrews) * 100) : null;
  const yesterdayPct = yesterdaySummary.totalCrews ? Math.round((yesterdaySummary.onTarget / yesterdaySummary.totalCrews) * 100) : null;
  const crewsOnTargetDelta = (crewsOnTargetPct !== null && yesterdayPct !== null) ? crewsOnTargetPct - yesterdayPct : null;
  const entriesDelta = entriesToday.rows[0].n - entriesYesterday.rows[0].n;

  res.render('management/index', {
    activeSites: activeSites.rows[0].n,
    activeWorkers: activeWorkers.rows[0].n,
    entriesToday: entriesToday.rows[0].n,
    entriesDelta,
    crewsOnTargetPct,
    crewsOnTargetDelta,
    crews,
    chart,
  });
});

module.exports = router;
