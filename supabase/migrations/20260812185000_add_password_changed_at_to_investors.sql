ALTER TABLE investors ADD COLUMN IF NOT EXISTS password_changed_at timestamptz DEFAULT NULL;
