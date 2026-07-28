const pool = require('./pool');

// Never pass a PIN value in `details` — only that a login happened/failed.
async function logActivity({ userId = null, userName, role, action, details = null }) {
  await pool.query(
    'INSERT INTO activity_log (user_id, user_name, role, action, details) VALUES ($1,$2,$3,$4,$5)',
    [userId, userName, role, action, details]
  );
}

module.exports = { logActivity };
