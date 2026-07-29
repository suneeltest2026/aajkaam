// Runs once when the app boots and makes sure the schema matches what the
// code expects — every ADD/CREATE statement here is safe to re-run on a
// database that already has it, so a normal deploy never touches existing
// data. Keeps a fresh code deploy from ever outrunning its database again.
//
// The DROP statements at the end are the one exception: they remove the
// crew tables/column this version of the app no longer uses. That's a
// real, one-time, irreversible data loss for anything that was only
// stored in crews/crew_members/crew_supervisors/daily_entries.crew_id —
// acceptable here because the app moved to direct worker/supervisor
// project tags instead, but worth knowing before this runs against a
// database with real crew data in it.
const pool = require('./pool');

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('worker','supervisor','management','admin')),
        worker_id INTEGER REFERENCES workers(id),
        pin_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS entered_by_user_id INTEGER REFERENCES users(id);

    CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        user_name VARCHAR(150),
        role VARCHAR(20),
        action VARCHAR(100) NOT NULL,
        details VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE projects ADD COLUMN IF NOT EXISTS location VARCHAR(255);
    ALTER TABLE workers ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id);
    ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS worker_id INTEGER REFERENCES workers(id);

    DROP TABLE IF EXISTS crew_supervisors;
    DROP TABLE IF EXISTS crew_members;
    ALTER TABLE daily_entries DROP COLUMN IF EXISTS crew_id;
    DROP TABLE IF EXISTS crews;
  `);
}

module.exports = { ensureSchema };
