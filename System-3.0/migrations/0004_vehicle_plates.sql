-- Existing records remain intact. A missing plate must be registered by the operator.
ALTER TABLE quotes ADD COLUMN plate TEXT CHECK(plate IS NULL OR (length(plate)=7 AND (plate GLOB '[A-Z][A-Z][A-Z][0-9][0-9][0-9][0-9]' OR plate GLOB '[A-Z][A-Z][A-Z][0-9][A-Z][0-9][0-9]')));
ALTER TABLE quotes ADD COLUMN plate_checked_at TEXT;
ALTER TABLE quotes ADD COLUMN plate_checked_by TEXT;
ALTER TABLE subscriptions ADD COLUMN plate TEXT CHECK(plate IS NULL OR (length(plate)=7 AND (plate GLOB '[A-Z][A-Z][A-Z][0-9][0-9][0-9][0-9]' OR plate GLOB '[A-Z][A-Z][A-Z][0-9][A-Z][0-9][0-9]')));
ALTER TABLE visits ADD COLUMN plate TEXT CHECK(plate IS NULL OR (length(plate)=7 AND (plate GLOB '[A-Z][A-Z][A-Z][0-9][0-9][0-9][0-9]' OR plate GLOB '[A-Z][A-Z][A-Z][0-9][A-Z][0-9][0-9]')));
ALTER TABLE visits ADD COLUMN plate_checked_at TEXT;
ALTER TABLE visits ADD COLUMN plate_checked_by TEXT;
-- Different vehicles can have the same model, including for the same customer.
DROP INDEX subscriptions_vehicle;
CREATE UNIQUE INDEX subscriptions_active_plate ON subscriptions(plate) WHERE plate IS NOT NULL AND status!='cancelled';
CREATE INDEX quotes_plate_created ON quotes(plate,created_at DESC);
-- Enforce plate matching inside the transaction, including concurrent changes.
CREATE TRIGGER quotes_care_plate_insert BEFORE INSERT ON quotes WHEN NEW.kind='subscription_visit' AND NOT EXISTS(SELECT 1 FROM subscriptions s WHERE s.id=NEW.subscription_id AND s.status='active' AND s.plate=NEW.plate AND NEW.plate IS NOT NULL) BEGIN SELECT RAISE(ABORT,'FF_PLATE_MISMATCH'); END;
CREATE TRIGGER quotes_care_plate_status BEFORE UPDATE OF status ON quotes WHEN NEW.kind='subscription_visit' AND NEW.status IN ('accepted','in_progress','ready','completed') AND (NOT EXISTS(SELECT 1 FROM subscriptions s WHERE s.id=NEW.subscription_id AND s.status='active' AND s.plate=NEW.plate AND NEW.plate IS NOT NULL) OR (NEW.status IN ('in_progress','ready','completed') AND NEW.plate_checked_at IS NULL)) BEGIN SELECT RAISE(ABORT,'FF_PLATE_MISMATCH'); END;
CREATE TRIGGER visits_plate_insert BEFORE INSERT ON visits WHEN NOT EXISTS(SELECT 1 FROM cycles c JOIN subscriptions s ON s.id=c.subscription_id WHERE c.id=NEW.cycle_id AND s.status='active' AND c.paid=1 AND s.plate=NEW.plate AND NEW.plate IS NOT NULL) OR (NEW.status IN ('in_progress','completed') AND NEW.plate_checked_at IS NULL) BEGIN SELECT RAISE(ABORT,'FF_PLATE_MISMATCH'); END;
CREATE TRIGGER visits_plate_status BEFORE UPDATE OF status ON visits WHEN NEW.status IN ('in_progress','completed') AND (NEW.plate_checked_at IS NULL OR NOT EXISTS(SELECT 1 FROM cycles c JOIN subscriptions s ON s.id=c.subscription_id WHERE c.id=NEW.cycle_id AND s.status='active' AND s.plate=NEW.plate AND NEW.plate IS NOT NULL)) BEGIN SELECT RAISE(ABORT,'FF_PLATE_MISMATCH'); END;
