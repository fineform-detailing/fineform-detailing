-- Preserve old values; a customer-entered plate does not prove a physical check.
ALTER TABLE quotes ADD COLUMN plate_verified_at TEXT;
ALTER TABLE quotes ADD COLUMN plate_verified_by TEXT;
ALTER TABLE subscriptions ADD COLUMN plate_verified_at TEXT;
ALTER TABLE subscriptions ADD COLUMN plate_verified_by TEXT;
DROP TRIGGER quotes_care_plate_insert;
DROP TRIGGER quotes_care_plate_status;
DROP TRIGGER visits_plate_insert;
DROP TRIGGER visits_plate_status;
CREATE TRIGGER quotes_care_plate_insert BEFORE INSERT ON quotes WHEN NEW.kind='subscription_visit' AND NOT EXISTS(SELECT 1 FROM subscriptions s WHERE s.id=NEW.subscription_id AND s.status='active' AND s.plate=NEW.plate AND s.plate_verified_at IS NOT NULL AND NEW.plate IS NOT NULL) BEGIN SELECT RAISE(ABORT,'FF_VEHICLE_NOT_REGISTERED'); END;
CREATE TRIGGER quotes_vehicle_registered BEFORE UPDATE OF status ON quotes WHEN NEW.status IN ('in_progress','ready','completed') AND (NEW.plate IS NULL OR NEW.plate_verified_at IS NULL) BEGIN SELECT RAISE(ABORT,'FF_VEHICLE_NOT_REGISTERED'); END;
CREATE TRIGGER quotes_care_plate_status BEFORE UPDATE OF status ON quotes WHEN NEW.kind='subscription_visit' AND NEW.status IN ('accepted','in_progress','ready','completed') AND (NOT EXISTS(SELECT 1 FROM subscriptions s WHERE s.id=NEW.subscription_id AND s.status='active' AND s.plate=NEW.plate AND s.plate_verified_at IS NOT NULL AND NEW.plate IS NOT NULL) OR (NEW.status IN ('in_progress','ready','completed') AND NEW.plate_checked_at IS NULL)) BEGIN SELECT RAISE(ABORT,'FF_PLATE_MISMATCH'); END;
CREATE TRIGGER visits_plate_insert BEFORE INSERT ON visits WHEN NOT EXISTS(SELECT 1 FROM cycles c JOIN subscriptions s ON s.id=c.subscription_id WHERE c.id=NEW.cycle_id AND s.status='active' AND c.paid=1 AND s.plate=NEW.plate AND s.plate_verified_at IS NOT NULL AND NEW.plate IS NOT NULL) OR (NEW.status IN ('in_progress','completed') AND NEW.plate_checked_at IS NULL) BEGIN SELECT RAISE(ABORT,'FF_PLATE_MISMATCH'); END;
CREATE TRIGGER visits_plate_status BEFORE UPDATE OF status ON visits WHEN NEW.status IN ('in_progress','completed') AND (NEW.plate_checked_at IS NULL OR NOT EXISTS(SELECT 1 FROM cycles c JOIN subscriptions s ON s.id=c.subscription_id WHERE c.id=NEW.cycle_id AND s.status='active' AND s.plate=NEW.plate AND s.plate_verified_at IS NOT NULL AND NEW.plate IS NOT NULL)) BEGIN SELECT RAISE(ABORT,'FF_PLATE_MISMATCH'); END;
CREATE TRIGGER subscriptions_verified_activation BEFORE INSERT ON subscriptions WHEN NEW.plate IS NULL OR NEW.plate_verified_at IS NULL OR NEW.plate_verified_by IS NULL BEGIN SELECT RAISE(ABORT,'FF_VEHICLE_NOT_REGISTERED'); END;
