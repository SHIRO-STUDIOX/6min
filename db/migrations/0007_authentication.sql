CREATE TABLE auth_challenges (
 id text PRIMARY KEY, phone text NOT NULL, purpose text NOT NULL CHECK(purpose IN ('login','recover')),
 code_hash text NOT NULL, expires_at timestamptz NOT NULL, resend_after timestamptz NOT NULL,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0), consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_phone_cooldown ON auth_challenges(phone,purpose,created_at DESC);
CREATE TABLE recovery_grants (
 token_hash text PRIMARY KEY, phone text NOT NULL, expires_at timestamptz NOT NULL, consumed_at timestamptz
);
ALTER TABLE sessions ADD COLUMN new_account boolean NOT NULL DEFAULT false;
ALTER TABLE sessions ADD COLUMN source_guest_id text REFERENCES subjects(id);
ALTER TABLE guest_imports ADD COLUMN source_guest_id text REFERENCES subjects(id);
CREATE TABLE guest_attempt_links (
 user_id text NOT NULL REFERENCES users(id), source_attempt_id text NOT NULL REFERENCES learning_attempts(id),
 target_attempt_id text NOT NULL REFERENCES learning_attempts(id), PRIMARY KEY(user_id,source_attempt_id)
);
CREATE TABLE guest_watch_links (
 user_id text NOT NULL REFERENCES users(id), source_watch_id text NOT NULL REFERENCES watch_sessions(id),
 target_watch_id text NOT NULL REFERENCES watch_sessions(id), PRIMARY KEY(user_id,source_watch_id)
);
CREATE TABLE guest_import_drafts (
 import_id text NOT NULL REFERENCES guest_imports(id), stage_id text NOT NULL REFERENCES stages(id),
 input jsonb NOT NULL, updated_at timestamptz NOT NULL, PRIMARY KEY(import_id,stage_id)
);
