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

-- 7. WORKERS
CREATE TABLE workers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    trade_id INTEGER REFERENCES trades(id),
    skill_level_id INTEGER REFERENCES skill_levels(id),
    is_active BOOLEAN DEFAULT TRUE
);

-- 8. CREWS: a saved team template (e.g. "Blockwork Crew A")
CREATE TABLE crews (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    activity_id INTEGER REFERENCES activities(id)
);

-- 9. CREW MEMBERS: who's on each crew, and their incentive share
CREATE TABLE crew_members (
    id SERIAL PRIMARY KEY,
    crew_id INTEGER REFERENCES crews(id),
    worker_id INTEGER REFERENCES workers(id),
    incentive_share_percent NUMERIC(5,2) NOT NULL -- e.g. 60.00 for skilled, 40.00 for helper
);

-- 10. TARGETS: expected output per crew type + project type + stage
--     If no exact match exists for a job, the app falls back to:
--     (a) historical average for that combination, or (b) a general default.
CREATE TABLE targets (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER REFERENCES activities(id),
    stage_id INTEGER REFERENCES activity_stages(id),
    project_type_id INTEGER REFERENCES project_types(id), -- NULL = general/default target
    target_per_day NUMERIC(10,2) NOT NULL,
    is_general_default BOOLEAN DEFAULT FALSE
);

-- 11. USERS: login accounts. A worker's login links to their `workers` row
--     (worker_id); supervisor and management accounts are login-only, no
--     separate profile table. PIN is stored hashed, never in plain text.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('worker','supervisor','management')),
    worker_id INTEGER REFERENCES workers(id), -- set only when role = 'worker'
    pin_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 12. DAILY ENTRIES: what the supervisor records each day
CREATE TABLE daily_entries (
    id SERIAL PRIMARY KEY,
    entry_date DATE NOT NULL,
    project_id INTEGER REFERENCES projects(id),
    crew_id INTEGER REFERENCES crews(id),
    activity_stage_id INTEGER REFERENCES activity_stages(id),
    units_completed NUMERIC(10,2) NOT NULL,
    hours_worked NUMERIC(5,2),
    entered_by VARCHAR(150),             -- supervisor's display name, cached for reports
    entered_by_user_id INTEGER REFERENCES users(id), -- the real login that made this entry
    created_at TIMESTAMP DEFAULT NOW()
);

-- 13. RECOGNITION: HR flags/acknowledgements for workers (no pay processing)
CREATE TABLE recognitions (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER REFERENCES workers(id),
    note VARCHAR(255) NOT NULL,          -- e.g. "Top Performer - July 2026"
    given_by VARCHAR(150),
    created_at TIMESTAMP DEFAULT NOW()
);
