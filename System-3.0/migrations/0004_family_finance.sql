PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS family_finance_users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 role TEXT NOT NULL CHECK(role IN ('admin','father','mother')),
 password_hash TEXT NOT NULL, password_salt TEXT NOT NULL,
 created_at TEXT NOT NULL, last_login TEXT
);
CREATE TABLE IF NOT EXISTS family_finance_invites (
 id TEXT PRIMARY KEY, code_hash TEXT NOT NULL UNIQUE,
 role TEXT NOT NULL CHECK(role IN ('father','mother')),
 expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS family_finance_contributions (
 id TEXT PRIMARY KEY, person_role TEXT NOT NULL CHECK(person_role IN ('father','mother')),
 label TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
 due_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reported','confirmed','overdue')),
 reported_at TEXT, confirmed_at TEXT, confirmed_by TEXT, note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(person_role,label,due_date)
);
CREATE TABLE IF NOT EXISTS family_finance_sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES family_finance_users(id) ON DELETE CASCADE,
 expires_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS family_finance_notifications (
 id TEXT PRIMARY KEY, user_id TEXT REFERENCES family_finance_users(id) ON DELETE CASCADE,
 person_role TEXT, contribution_id TEXT REFERENCES family_finance_contributions(id) ON DELETE CASCADE,
 kind TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL,
 scheduled_for TEXT NOT NULL, sent_at TEXT, created_at TEXT NOT NULL,
 UNIQUE(user_id,contribution_id,kind)
);
CREATE INDEX IF NOT EXISTS family_finance_due ON family_finance_contributions(status,due_date);
CREATE INDEX IF NOT EXISTS family_finance_session_expiry ON family_finance_sessions(expires_at);
INSERT OR IGNORE INTO family_finance_contributions
(id,person_role,label,amount_cents,due_date,created_at,updated_at) VALUES
('ffdad-2026-11','father','Contribuição de novembro',80000,'2026-11-30','2026-11-09','2026-11-09'),
('ffdad-2026-12','father','Contribuição de dezembro',80000,'2026-12-31','2026-11-09','2026-11-09'),
('ffdad-extra-2026-12','father','Extra de dezembro',300000,'2026-12-31','2026-11-09','2026-11-09'),
('ffdad-2027-01','father','Contribuição de janeiro',80000,'2027-01-31','2026-11-09','2026-11-09'),
('ffdad-2027-02','father','Contribuição de fevereiro',80000,'2027-02-28','2026-11-09','2026-11-09'),
('ffdad-2027-03','father','Contribuição de março',80000,'2027-03-31','2026-11-09','2026-11-09'),
('ffmom-2027-03','mother','Contribuição única de março',400000,'2027-03-31','2026-11-09','2026-11-09');
