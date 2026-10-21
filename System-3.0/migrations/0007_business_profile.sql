-- A private operational address is never part of the public configuration.
CREATE TABLE business_profile (
 id INTEGER PRIMARY KEY CHECK (id = 1),
 data_json TEXT NOT NULL DEFAULT '{}',
 version INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT,
 last_op TEXT
);
INSERT INTO business_profile(id) VALUES (1);
-- Snapshot released explicitly for this order, protected by its existing link.
ALTER TABLE quotes ADD COLUMN location_json TEXT;
