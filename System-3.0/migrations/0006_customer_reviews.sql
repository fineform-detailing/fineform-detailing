-- Reviews are tied to an actual order. Private delivery credentials never appear publicly.
CREATE TABLE reviews (
 id TEXT PRIMARY KEY, quote_id TEXT NOT NULL UNIQUE REFERENCES quotes(id) ON DELETE CASCADE,
 rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), comment TEXT NOT NULL CHECK(length(comment)<=600),
 first_name TEXT NOT NULL, vehicle TEXT NOT NULL CHECK(vehicle IN ('car','moto')),
 published INTEGER NOT NULL DEFAULT 1 CHECK(published IN (0,1)),
 consent_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX reviews_public ON reviews(published,created_at DESC,id DESC);
CREATE TABLE customer_push_subscriptions (
 id TEXT PRIMARY KEY, quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
 endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
 viewer_hash TEXT NOT NULL, vapid_key TEXT NOT NULL, origin TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_sent_at TEXT, last_error TEXT,
 UNIQUE(quote_id,endpoint)
);
CREATE INDEX customer_push_quote ON customer_push_subscriptions(quote_id);
CREATE INDEX customer_push_expiry ON customer_push_subscriptions(updated_at);
CREATE TABLE customer_push_jobs (
 quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
 subscription_id TEXT NOT NULL REFERENCES customer_push_subscriptions(id) ON DELETE CASCADE,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sent','failed')),
 attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at INTEGER NOT NULL,
 lease_token TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, last_error TEXT,
 PRIMARY KEY(quote_id,subscription_id)
);
CREATE INDEX customer_push_due ON customer_push_jobs(state,next_attempt_at,lease_until);
