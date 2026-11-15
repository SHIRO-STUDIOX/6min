ALTER TABLE users ADD COLUMN auth_mode text NOT NULL DEFAULT 'mock' CHECK(auth_mode IN ('mock','real'));
