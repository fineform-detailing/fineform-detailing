CREATE TABLE IF NOT EXISTS family_finance_admin_setup (
 id INTEGER PRIMARY KEY CHECK(id=1),
 code_hash TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 used_at TEXT,
 created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS family_finance_single_admin
 ON family_finance_users(role) WHERE role='admin';
