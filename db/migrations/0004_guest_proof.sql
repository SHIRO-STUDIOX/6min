CREATE TABLE guest_sessions (
 token_hash text PRIMARY KEY,
 subject_id text NOT NULL REFERENCES subjects(id),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX guest_session_subject ON guest_sessions(subject_id);
