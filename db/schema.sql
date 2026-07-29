-- AajKaam Database Structure — Phase 1
-- This file defines every "table" (like a spreadsheet tab) the app needs.
-- Run this once when setting up the database (steps are in README.md).

-- 1. TRADES: the type of skilled work (mason, carpenter, painter, etc.)
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE   -- e.g. "Mason", "Carpenter", "Painter"
);

-- 2. SKILL LEVELS: how experienced a worker is
CREATE TABLE skill_levels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE    -- e.g. "Helper", "Semi-Skilled", "Skilled"
);

-- 3. PROJECT TYPES: villa, tower, warehouse, etc.
CREATE TABLE project_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 4. PROJECTS: an actual job site, linked to a project type
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(255),
    project_type_id INTEGER REFERENCES project_types(id),
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. ACTIVITIES: a task made of one or more stages (e.g. "Ceiling Work")
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,          -- e.g. "Ceiling Work"
    unit VARCHAR(30) NOT NULL DEFAULT 'sqm'  -- unit of measure: sqm, meter, etc.
);

-- 6. STAGES: the steps within an activity, each with a weight (must add to 100 per activity)
CREATE TABLE activity_stages (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER REFERENCES activities(id),
    name VARCHAR(100) NOT NULL,          -- e.g. "Framing", "Boarding", "Painting"
    weight_percent NUMERIC(5,2) NOT NULL,-- e.g. 40.00 for 40%
    sequence_order INTEGER NOT NULL       -- 1, 2, 3 = order stages happen in
);

-- 7. WORKERS: tagged directly to one project — that tag is what lets a
--    supervisor on the same project log work for them (Setup -> Workers).
CREATE TABLE workers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    trade_id INTEGER REFERENCES trades(id),
    skill_level_id INTEGER REFERENCES skill_levels(id),
    project_id INTEGER REFERENCES projects(id),
    is_active BOOLEAN DEFAULT TRUE
);

-- 8. TARGETS: expected output per activity stage + project type per day.
--    If no exact match exists for a job, the app falls back to the
--    stage's general/default target.
CREATE TABLE targets (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER REFERENCES activities(id),
    stage_id INTEGER REFERENCES activity_stages(id),
    project_type_id INTEGER REFERENCES project_types(id), -- NULL = general/default target
    target_per_day NUMERIC(10,2) NOT NULL,
    is_general_default BOOLEAN DEFAULT FALSE
);

-- 9. USERS: login accounts. A worker's login links to their `workers` row
--    (worker_id); supervisor/management/admin accounts are login-only, no
--    separate profile table. PIN is stored hashed, never in plain text.
--    A supervisor is tagged to one project (Setup -> Users) — that tag is
--    what lets them log work for any worker tagged to the same project.
--    'admin' is a tier above management: same access, plus the activity
--    log (activity_log below), including management's own actions.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('worker','supervisor','management','admin')),
    worker_id INTEGER REFERENCES workers(id), -- set only when role = 'worker'
    project_id INTEGER REFERENCES projects(id), -- set only when role = 'supervisor'
    pin_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 10. DAILY ENTRIES: what the supervisor records each day, per worker.
--     project_id is always the worker's own tagged project at the time of
--     entry — never picked independently on the form.
CREATE TABLE daily_entries (
    id SERIAL PRIMARY KEY,
    entry_date DATE NOT NULL,
    project_id INTEGER REFERENCES projects(id),
    worker_id INTEGER REFERENCES workers(id),
    activity_stage_id INTEGER REFERENCES activity_stages(id),
    units_completed NUMERIC(10,2) NOT NULL,
    hours_worked NUMERIC(5,2),
    entered_by VARCHAR(150),             -- supervisor's display name, cached for reports
    entered_by_user_id INTEGER REFERENCES users(id), -- the real login that made this entry
    created_at TIMESTAMP DEFAULT NOW()
);

-- 11. RECOGNITION: HR flags/acknowledgements for workers (no pay processing)
CREATE TABLE recognitions (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER REFERENCES workers(id),
    note VARCHAR(255) NOT NULL,          -- e.g. "Top Performer - July 2026"
    given_by VARCHAR(150),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 12. ACTIVITY LOG: an audit trail for the admin role. Never store a PIN
--     value here, only that a login attempt happened and whether it
--     succeeded — user_name/role are cached so the log stays readable
--     even if the account is later renamed or deactivated.
CREATE TABLE activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    user_name VARCHAR(150),
    role VARCHAR(20),
    action VARCHAR(100) NOT NULL,
    details VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
