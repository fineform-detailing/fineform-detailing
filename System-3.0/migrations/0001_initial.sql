PRAGMA foreign_keys = ON;
CREATE TABLE customers (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE,
 vehicle TEXT NOT NULL CHECK(vehicle IN ('car','moto')), model TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE subscriptions (
 id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id),
 origin_quote_id TEXT, plan_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','cancelled')),
 vehicle TEXT NOT NULL, model TEXT NOT NULL COLLATE NOCASE, viewer_hash TEXT NOT NULL UNIQUE, billing_day INTEGER NOT NULL CHECK(billing_day BETWEEN 1 AND 31),
 version INTEGER NOT NULL DEFAULT 1, last_op TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX subscriptions_origin ON subscriptions(origin_quote_id) WHERE origin_quote_id IS NOT NULL;
CREATE UNIQUE INDEX subscriptions_vehicle ON subscriptions(customer_id,vehicle,model) WHERE status!='cancelled';
CREATE TABLE cycles (
 id TEXT PRIMARY KEY, subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
 starts_on TEXT NOT NULL, ends_on TEXT NOT NULL, price_cents INTEGER NOT NULL,
 premium_quota INTEGER NOT NULL, essential_quota INTEGER NOT NULL, moto_quota INTEGER NOT NULL,
 paid INTEGER NOT NULL DEFAULT 1 CHECK(paid IN (0,1)), state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','closed')),
 created_at TEXT NOT NULL, UNIQUE(subscription_id,starts_on), CHECK(ends_on > starts_on)
);
CREATE INDEX cycles_created ON cycles(created_at);
CREATE INDEX cycles_subscription_dates ON cycles(subscription_id, starts_on DESC);
CREATE TABLE quotes (
 id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE, viewer_hash TEXT NOT NULL UNIQUE,
 payload_hash TEXT NOT NULL, customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
 subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
 requested_cycle_id TEXT, credit_kind TEXT CHECK(credit_kind IS NULL OR credit_kind IN ('premium','essential','moto')),
 kind TEXT NOT NULL CHECK(kind IN ('single','plan','guidance','subscription_visit')),
 name TEXT NOT NULL, phone TEXT NOT NULL, vehicle TEXT NOT NULL, model TEXT NOT NULL,
 selection_json TEXT NOT NULL, budget_json TEXT NOT NULL, total_cents INTEGER,
 confirmed_total_cents INTEGER CHECK(confirmed_total_cents IS NULL OR confirmed_total_cents>=0),
 preferred_date TEXT, preferred_time TEXT, flexible INTEGER NOT NULL, notes TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','in_progress','ready','completed','cancelled')),
 public_message TEXT NOT NULL DEFAULT '', internal_note TEXT NOT NULL DEFAULT '',
 scheduled_date TEXT, scheduled_time TEXT, version INTEGER NOT NULL DEFAULT 1,
 last_op TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX quotes_status_created ON quotes(status, created_at DESC);
CREATE INDEX quotes_subscription ON quotes(subscription_id, created_at DESC);
CREATE INDEX quotes_schedule ON quotes(scheduled_date, status);
CREATE TABLE quote_events (
 id TEXT PRIMARY KEY, quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
 status TEXT NOT NULL, message TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX quote_events_quote ON quote_events(quote_id, created_at);
CREATE TABLE visits (
 id TEXT PRIMARY KEY, cycle_id TEXT NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
 quote_id TEXT UNIQUE REFERENCES quotes(id) ON DELETE SET NULL,
 kind TEXT NOT NULL CHECK(kind IN ('premium','essential','moto')),
 status TEXT NOT NULL CHECK(status IN ('scheduled','in_progress','completed','cancelled')),
 visit_date TEXT NOT NULL, visit_time TEXT, note TEXT NOT NULL DEFAULT '',
 completed_at TEXT, version INTEGER NOT NULL DEFAULT 1, last_op TEXT,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX visits_cycle_kind ON visits(cycle_id, kind, status);
CREATE INDEX visits_date ON visits(visit_date,status);
CREATE TABLE audit_events (
 id TEXT PRIMARY KEY, entity TEXT NOT NULL, entity_id TEXT NOT NULL,
 action TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX audit_created ON audit_events(created_at DESC);
CREATE TABLE rate_buckets (
 id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
