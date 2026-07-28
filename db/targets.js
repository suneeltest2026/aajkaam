// Shared target lookup used by the worker and management dashboards:
// prefer a target matched to the project's type, else fall back to the
// stage's general/default target (see schema.sql note on targets).
const pool = require('./pool');

async function getTargetForStage(stageId, projectTypeId) {
  if (projectTypeId) {
    const exact = await pool.query(
      'SELECT target_per_day FROM targets WHERE stage_id = $1 AND project_type_id = $2 LIMIT 1',
      [stageId, projectTypeId]
    );
    if (exact.rows.length) return parseFloat(exact.rows[0].target_per_day);
  }
  const general = await pool.query(
    'SELECT target_per_day FROM targets WHERE stage_id = $1 AND is_general_default = TRUE LIMIT 1',
    [stageId]
  );
  return general.rows.length ? parseFloat(general.rows[0].target_per_day) : null;
}

module.exports = { getTargetForStage };
