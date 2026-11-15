ALTER TABLE purchases ADD COLUMN provider text NOT NULL DEFAULT 'unconfigured';
ALTER TABLE purchases ADD COLUMN provider_ref text UNIQUE;
ALTER TABLE purchases ADD COLUMN request_hash text;
ALTER TABLE purchases ADD COLUMN return_lesson_id text REFERENCES lessons(id);
ALTER TABLE purchases ADD COLUMN expires_at timestamptz NOT NULL DEFAULT now()+interval '30 minutes';
CREATE TABLE payment_events (
 id uuid PRIMARY KEY, purchase_id text NOT NULL REFERENCES purchases(id),
 outcome text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
