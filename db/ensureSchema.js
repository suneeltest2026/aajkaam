// Runs once when the app boots and makes sure the schema matches what the
// code expects — every statement here is safe to re-run on a database that
// already has these tables/columns, so this never touches existing data.
// Keeps a fresh code deploy from ever outrunning its database again.
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

    ALTER TABLE crews ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id);

    CREATE TABLE IF NOT EXISTS crew_supervisors (
        id SERIAL PRIMARY KEY,
        crew_id INTEGER REFERENCES crews(id),
        user_id INTEGER REFERENCES users(id),
        UNIQUE (crew_id, user_id)
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
  `);
}

module.exports = { ensureSchema };
