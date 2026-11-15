CREATE TABLE subjects (
 id text PRIMARY KEY,
 kind text NOT NULL CHECK (kind IN ('user','guest')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE users (
 id text PRIMARY KEY REFERENCES subjects(id),
 phone text UNIQUE,
 phone_verified_at timestamptz,
 password_hash text,
 display_name text NOT NULL DEFAULT '',
 avatar_key text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
 token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id),
 expires_at timestamptz NOT NULL, revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE courses (id text PRIMARY KEY, title text NOT NULL, published boolean NOT NULL DEFAULT false);
CREATE TABLE lessons (
 id text PRIMARY KEY, course_id text NOT NULL REFERENCES courses(id),
 sequence_number integer NOT NULL CHECK (sequence_number BETWEEN 1 AND 60),
 short_title text NOT NULL, published boolean NOT NULL DEFAULT false,
 current_revision_id text, UNIQUE(course_id,sequence_number)
);
CREATE TABLE lesson_revisions (
 id text PRIMARY KEY, lesson_id text NOT NULL REFERENCES lessons(id),
 version integer NOT NULL CHECK (version > 0), video_asset_id text,
 video_url text, duration_ms integer CHECK(duration_ms > 0),
 video_weight numeric CHECK(video_weight BETWEEN 0 AND 100),
 unlock_threshold numeric CHECK(unlock_threshold BETWEEN 0 AND 100),
 content_hash text NOT NULL, demo_only boolean NOT NULL DEFAULT true,
 published_at timestamptz, UNIQUE(lesson_id,version),
 CHECK(published_at IS NULL OR (video_weight IS NOT NULL AND unlock_threshold IS NOT NULL AND video_asset_id IS NOT NULL))
);
ALTER TABLE lessons ADD CONSTRAINT lessons_revision_fk FOREIGN KEY (current_revision_id) REFERENCES lesson_revisions(id);
CREATE TABLE stages (
 id text PRIMARY KEY, revision_id text NOT NULL REFERENCES lesson_revisions(id),
 stage_order integer NOT NULL CHECK(stage_order >= 0),
 kind text NOT NULL CHECK(kind IN ('video','exercise','completion')),
 exercise_type text, public_config jsonb NOT NULL DEFAULT '{}',
 UNIQUE(revision_id,stage_order)
);
CREATE TABLE questions (
 id text NOT NULL, revision integer NOT NULL CHECK(revision > 0),
 stage_id text NOT NULL REFERENCES stages(id), stable_order integer NOT NULL,
 public_config jsonb NOT NULL, answer_key jsonb NOT NULL,
 grading_kind text NOT NULL, active boolean NOT NULL DEFAULT true,
 PRIMARY KEY(id,revision), UNIQUE(stage_id,stable_order)
);
CREATE TABLE learning_attempts (
 id text PRIMARY KEY, subject_id text NOT NULL REFERENCES subjects(id),
 revision_id text NOT NULL REFERENCES lesson_revisions(id), stage_id text NOT NULL REFERENCES stages(id),
 kind text NOT NULL CHECK(kind IN ('full','review')),
 started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz NOT NULL DEFAULT now(),
 completed boolean NOT NULL CHECK(completed), idempotency_key text NOT NULL,
 request_hash text NOT NULL, score numeric NOT NULL CHECK(score BETWEEN 0 AND 1),
 UNIQUE(subject_id,idempotency_key), CHECK(completed_at >= started_at)
);
CREATE TABLE question_results (
 attempt_id text NOT NULL REFERENCES learning_attempts(id),
 question_id text NOT NULL, question_revision integer NOT NULL,
 correct boolean NOT NULL, answer_payload jsonb NOT NULL,
 PRIMARY KEY(attempt_id,question_id,question_revision),
 FOREIGN KEY(question_id,question_revision) REFERENCES questions(id,revision)
);
CREATE TABLE mistake_events (
 id text PRIMARY KEY, subject_id text NOT NULL REFERENCES subjects(id),
 question_id text NOT NULL, question_revision integer NOT NULL,
 attempt_id text NOT NULL REFERENCES learning_attempts(id),
 kind text NOT NULL CHECK(kind IN ('incorrect','corrected','reopened')),
 event_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(question_id,question_revision) REFERENCES questions(id,revision),
 UNIQUE(attempt_id,question_id,question_revision)
);
CREATE TABLE mistake_current (
 subject_id text NOT NULL REFERENCES subjects(id), question_id text NOT NULL, question_revision integer NOT NULL,
 status text NOT NULL CHECK(status IN ('needsReview','corrected')),
 latest_wrong_at timestamptz NOT NULL, latest_valid_answer_at timestamptz,
 PRIMARY KEY(subject_id,question_id,question_revision),
 FOREIGN KEY(question_id,question_revision) REFERENCES questions(id,revision)
);
CREATE TABLE watch_sessions (
 id text PRIMARY KEY, subject_id text NOT NULL REFERENCES subjects(id),
 revision_id text NOT NULL REFERENCES lesson_revisions(id), video_asset_id text NOT NULL,
 valid_ranges jsonb NOT NULL DEFAULT '[]', max_playback_ms integer NOT NULL DEFAULT 0 CHECK(max_playback_ms>=0),
 last_position_ms integer NOT NULL DEFAULT 0 CHECK(last_position_ms>=0),
 sequence integer NOT NULL DEFAULT 0, credited_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE lesson_progress (
 subject_id text NOT NULL REFERENCES subjects(id), lesson_id text NOT NULL REFERENCES lessons(id),
 effective_score numeric NOT NULL DEFAULT 0 CHECK(effective_score BETWEEN 0 AND 100),
 video_credited boolean NOT NULL DEFAULT false, threshold_reached_at timestamptz,
 unlocked_at timestamptz, last_activity_at timestamptz, current_revision text REFERENCES lesson_revisions(id),
 PRIMARY KEY(subject_id,lesson_id)
);
CREATE TABLE exercise_progress (
 subject_id text NOT NULL REFERENCES subjects(id), stage_id text NOT NULL REFERENCES stages(id),
 best_attempt_id text REFERENCES learning_attempts(id), last_attempt_id text REFERENCES learning_attempts(id),
 earned_fraction numeric NOT NULL DEFAULT 0 CHECK(earned_fraction BETWEEN 0 AND 1),
 PRIMARY KEY(subject_id,stage_id)
);
CREATE TABLE purchases (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), product_id text NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), currency text NOT NULL,
 status text NOT NULL CHECK(status IN ('pending','verified','failed','cancelled')),
 idempotency_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,idempotency_key)
);
CREATE TABLE payment_transactions (
 id text PRIMARY KEY, purchase_id text NOT NULL REFERENCES purchases(id),
 provider text NOT NULL, provider_payment_id text NOT NULL,
 status text NOT NULL, verified_at timestamptz, safe_metadata jsonb NOT NULL DEFAULT '{}',
 UNIQUE(provider,provider_payment_id)
);
CREATE TABLE entitlements (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), product_id text NOT NULL,
 source_purchase_id text NOT NULL REFERENCES purchases(id), granted_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz
);
CREATE UNIQUE INDEX entitlement_active_unique ON entitlements(user_id,product_id) WHERE revoked_at IS NULL;
CREATE TABLE last_activity (
 subject_id text PRIMARY KEY REFERENCES subjects(id), lesson_id text NOT NULL REFERENCES lessons(id),
 stage_id text REFERENCES stages(id), draft_id text, source_route text,
 scroll_state jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE drafts (
 subject_id text NOT NULL REFERENCES subjects(id), stage_id text NOT NULL REFERENCES stages(id),
 local_version integer NOT NULL CHECK(local_version>=0), input jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(subject_id,stage_id)
);
CREATE TABLE guest_imports (
 id text PRIMARY KEY, guest_batch_id text NOT NULL, target_user_id text NOT NULL REFERENCES users(id),
 status text NOT NULL CHECK(status IN ('pending','completed')), consent_at timestamptz,
 checksum text NOT NULL, completed_at timestamptz, UNIQUE(guest_batch_id,target_user_id)
);
CREATE FUNCTION protect_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'immutable historical record'; END;
$$;
CREATE TRIGGER attempts_immutable BEFORE UPDATE OR DELETE ON learning_attempts FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER results_immutable BEFORE UPDATE OR DELETE ON question_results FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER mistakes_immutable BEFORE UPDATE OR DELETE ON mistake_events FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE INDEX mistakes_subject_time ON mistake_events(subject_id,event_at DESC);
CREATE INDEX attempts_subject_stage ON learning_attempts(subject_id,stage_id,completed_at);
