CREATE TABLE selected_context (
 subject_id text PRIMARY KEY REFERENCES subjects(id), lesson_id text NOT NULL REFERENCES lessons(id),
 stage_id text NOT NULL REFERENCES stages(id), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE support_reports (
 id text PRIMARY KEY, subject_id text NOT NULL REFERENCES subjects(id),
 message text NOT NULL CHECK(length(message) BETWEEN 5 AND 1000),
 lesson_id text REFERENCES lessons(id), stage_id text REFERENCES stages(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
