CREATE TABLE avatar_assets (
 id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES users(id),
 media_type text NOT NULL CHECK(media_type='image/png'),
 byte_size integer NOT NULL CHECK(byte_size BETWEEN 1 AND 2097152),
 created_at timestamptz NOT NULL DEFAULT now()
);
