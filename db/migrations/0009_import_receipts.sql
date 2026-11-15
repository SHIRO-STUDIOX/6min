ALTER TABLE guest_imports ADD COLUMN summary jsonb NOT NULL DEFAULT '{}';
ALTER TABLE sessions ADD COLUMN authenticated_at timestamptz NOT NULL DEFAULT now();
