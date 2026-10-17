-- Preserve customers, subscriptions and historical payments.
CREATE TABLE admin_sessions (
 id TEXT PRIMARY KEY, key_hash TEXT NOT NULL, agent_hash TEXT NOT NULL, audience TEXT NOT NULL,
 created_at INTEGER NOT NULL, authenticated_at INTEGER NOT NULL, last_seen INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX admin_sessions_expiry ON admin_sessions(expires_at);
CREATE INDEX admin_sessions_idle ON admin_sessions(last_seen);
CREATE INDEX rate_buckets_expiry ON rate_buckets(expires_at);
CREATE TABLE mfa_counters (id TEXT PRIMARY KEY, last_step INTEGER NOT NULL);
CREATE TABLE realtime_tickets (id TEXT PRIMARY KEY, session_id TEXT, expires_at INTEGER NOT NULL);
CREATE INDEX realtime_tickets_expiry ON realtime_tickets(expires_at);
ALTER TABLE cycles ADD COLUMN confirmed_by TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE audit_events ADD COLUMN actor_id TEXT NOT NULL DEFAULT 'legacy';
CREATE TABLE payment_receipts (
 id TEXT PRIMARY KEY, cycle_id TEXT NOT NULL UNIQUE, subscription_id TEXT NOT NULL,
 amount_cents INTEGER NOT NULL CHECK(typeof(amount_cents)='integer' AND amount_cents>=0 AND amount_cents<=10000000),
 received_at TEXT NOT NULL, actor_id TEXT NOT NULL,
 source TEXT NOT NULL CHECK(source IN ('legacy_import','manual_confirmation'))
);
CREATE INDEX payment_receipts_received ON payment_receipts(received_at);
CREATE INDEX payment_receipts_month ON payment_receipts(strftime('%Y-%m',received_at,'-3 hours'));
-- Financial evidence contains no customer names or contact details.
INSERT INTO payment_receipts(id,cycle_id,subscription_id,amount_cents,received_at,actor_id,source)
 SELECT 'receipt:'||id,id,subscription_id,price_cents,created_at,'legacy','legacy_import' FROM cycles WHERE paid=1;
CREATE TRIGGER cycles_valid_money BEFORE INSERT ON cycles WHEN typeof(NEW.price_cents)!='integer' OR NEW.price_cents<0 OR NEW.price_cents>10000000 BEGIN SELECT RAISE(ABORT,'Invalid payment amount'); END;
CREATE TRIGGER cycles_payment_immutable BEFORE UPDATE OF paid,price_cents,created_at,confirmed_by,subscription_id,id ON cycles WHEN OLD.paid=1 AND (NEW.paid!=OLD.paid OR NEW.price_cents!=OLD.price_cents OR NEW.created_at!=OLD.created_at OR NEW.confirmed_by!=OLD.confirmed_by OR NEW.subscription_id!=OLD.subscription_id OR NEW.id!=OLD.id) BEGIN SELECT RAISE(ABORT,'Confirmed payment cannot be rewritten'); END;
CREATE TRIGGER cycles_receipt_insert AFTER INSERT ON cycles WHEN NEW.paid=1 BEGIN INSERT INTO payment_receipts(id,cycle_id,subscription_id,amount_cents,received_at,actor_id,source) VALUES ('receipt:'||NEW.id,NEW.id,NEW.subscription_id,NEW.price_cents,NEW.created_at,NEW.confirmed_by,'manual_confirmation'); END;
CREATE TRIGGER cycles_receipt_paid AFTER UPDATE OF paid ON cycles WHEN OLD.paid=0 AND NEW.paid=1 BEGIN INSERT INTO payment_receipts(id,cycle_id,subscription_id,amount_cents,received_at,actor_id,source) VALUES ('receipt:'||NEW.id,NEW.id,NEW.subscription_id,NEW.price_cents,NEW.created_at,NEW.confirmed_by,'manual_confirmation'); END;
CREATE TRIGGER receipts_no_update BEFORE UPDATE ON payment_receipts BEGIN SELECT RAISE(ABORT,'Payment receipts are append-only'); END;
CREATE TRIGGER receipts_no_delete BEFORE DELETE ON payment_receipts BEGIN SELECT RAISE(ABORT,'Payment receipts are append-only'); END;
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT,'Audit records are append-only'); END;
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT,'Audit records are append-only'); END;
