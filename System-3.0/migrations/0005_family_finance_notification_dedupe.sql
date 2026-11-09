CREATE UNIQUE INDEX IF NOT EXISTS family_finance_notification_once
ON family_finance_notifications(person_role,contribution_id,kind)
WHERE user_id IS NULL;
