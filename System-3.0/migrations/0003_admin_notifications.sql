-- Administrator devices and a durable notification outbox. Customer data is unchanged.
CREATE TABLE admin_push_subscriptions (
 id TEXT PRIMARY KEY, endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
 owner_hash TEXT NOT NULL, vapid_key TEXT NOT NULL, origin TEXT NOT NULL,
 label TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 last_sent_at TEXT, last_error TEXT
);
CREATE INDEX admin_push_active ON admin_push_subscriptions(origin,owner_hash,vapid_key);
CREATE TABLE admin_push_jobs (
 quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
 subscription_id TEXT NOT NULL REFERENCES admin_push_subscriptions(id) ON DELETE CASCADE,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sent','failed')),
 attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at INTEGER NOT NULL,
 lease_token TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, last_error TEXT,
 PRIMARY KEY(quote_id,subscription_id)
);
CREATE INDEX admin_push_due ON admin_push_jobs(state,next_attempt_at,lease_until);
CREATE INDEX admin_push_expiry ON admin_push_jobs(expires_at);
CREATE TABLE admin_push_vapid_tokens (
 origin TEXT PRIMARY KEY, key_id TEXT NOT NULL, authorization TEXT NOT NULL,
 refresh_at INTEGER NOT NULL
);
