-- SQLite local schema at PostgreSQL migrations 0001–0013; maintain parity with both-driver tests.
CREATE TABLE subjects (
 id text NOT NULL PRIMARY KEY,
 kind text NOT NULL CHECK (kind IN ('user','guest')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT (now())
);
CREATE TABLE users (
 auth_mode text NOT NULL DEFAULT 'mock' CHECK(auth_mode IN ('mock','real')),
 id text NOT NULL PRIMARY KEY REFERENCES subjects(id),
 phone text UNIQUE,
 phone_verified_at TIMESTAMPTZ,
 password_hash text,
 display_name text NOT NULL DEFAULT '',
 avatar_key text,
 created_at TIMESTAMPTZ NOT NULL DEFAULT (now())
);
CREATE TABLE sessions (
 new_account boolean NOT NULL DEFAULT false CHECK(new_account IN (0,1)),
 source_guest_id text REFERENCES subjects(id),
 authenticated_at TIMESTAMPTZ NOT NULL DEFAULT (now()),
 token_hash text NOT NULL PRIMARY KEY, user_id text NOT NULL REFERENCES users(id),
 expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT (now())
);
CREATE TABLE courses (id text NOT NULL PRIMARY KEY, title text NOT NULL, published boolean NOT NULL DEFAULT false CHECK(published IN (0,1)));
CREATE TABLE lessons (
 id text NOT NULL PRIMARY KEY, course_id text NOT NULL REFERENCES courses(id),
 sequence_number integer NOT NULL CHECK (sequence_number BETWEEN 1 AND 60),
 short_title text NOT NULL, published boolean NOT NULL DEFAULT false CHECK(published IN (0,1)),
 current_revision_id text REFERENCES lesson_revisions(id), UNIQUE(course_id,sequence_number), FOREIGN KEY(current_revision_id,id) REFERENCES lesson_revisions(id,lesson_id)
);
CREATE TABLE lesson_revisions (
 id text NOT NULL PRIMARY KEY, lesson_id text NOT NULL REFERENCES lessons(id),
 version integer NOT NULL CHECK (version > 0), video_asset_id text,
 video_url text, duration_ms integer CHECK(duration_ms > 0),
 video_weight numeric CHECK(video_weight BETWEEN 0 AND 100),
 unlock_threshold numeric CHECK(unlock_threshold BETWEEN 0 AND 100),
 content_hash text NOT NULL, demo_only boolean NOT NULL DEFAULT true CHECK(demo_only IN (0,1)),
 published_at TIMESTAMPTZ, UNIQUE(lesson_id,version), UNIQUE(id,lesson_id),
 CHECK(published_at IS NULL OR (video_weight IS NOT NULL AND unlock_threshold IS NOT NULL AND video_asset_id IS NOT NULL))
);

CREATE TABLE stages (
 id text NOT NULL PRIMARY KEY, revision_id text NOT NULL REFERENCES lesson_revisions(id),
 stage_order integer NOT NULL CHECK(stage_order >= 0),
 kind text NOT NULL CHECK(kind IN ('video','exercise','completion')),
 exercise_type text, public_config JSON NOT NULL DEFAULT '{}' CHECK(json_valid(public_config)),
 UNIQUE(revision_id,stage_order)
);
CREATE TABLE questions (
 id text NOT NULL, revision integer NOT NULL CHECK(revision > 0),
 stage_id text NOT NULL REFERENCES stages(id), stable_order integer NOT NULL,
 public_config JSON NOT NULL CHECK(json_valid(public_config)), answer_key JSON NOT NULL CHECK(json_valid(answer_key)),
 grading_kind text NOT NULL, active boolean NOT NULL DEFAULT true CHECK(active IN (0,1)),
 PRIMARY KEY(id,revision), UNIQUE(stage_id,stable_order)
);
CREATE TABLE learning_attempts (
 id text NOT NULL PRIMARY KEY, subject_id text NOT NULL REFERENCES subjects(id),
 revision_id text NOT NULL REFERENCES lesson_revisions(id), stage_id text NOT NULL REFERENCES stages(id),
 kind text NOT NULL CHECK(kind IN ('full','review')),
 started_at TIMESTAMPTZ NOT NULL DEFAULT (now()), completed_at TIMESTAMPTZ NOT NULL DEFAULT (now()),
 completed boolean NOT NULL CHECK(completed IN (0,1)) CHECK(completed), idempotency_key text NOT NULL,
 request_hash text NOT NULL, score numeric NOT NULL CHECK(score BETWEEN 0 AND 1),
 UNIQUE(subject_id,idempotency_key), CHECK(completed_at >= started_at)
);
CREATE TABLE question_results (
 attempt_id text NOT NULL REFERENCES learning_attempts(id),
 question_id text NOT NULL, question_revision integer NOT NULL,
 correct boolean NOT NULL CHECK(correct IN (0,1)), answer_payload JSON NOT NULL CHECK(json_valid(answer_payload)),
 PRIMARY KEY(attempt_id,question_id,question_revision),
 FOREIGN KEY(question_id,question_revision) REFERENCES questions(id,revision)
);
CREATE TABLE mistake_events (
 id text NOT NULL PRIMARY KEY, subject_id text NOT NULL REFERENCES subjects(id),
 question_id text NOT NULL, question_revision integer NOT NULL,
 attempt_id text NOT NULL REFERENCES learning_attempts(id),
 kind text NOT NULL CHECK(kind IN ('incorrect','corrected','reopened')),
 event_at TIMESTAMPTZ NOT NULL DEFAULT (now()),
 FOREIGN KEY(question_id,question_revision) REFERENCES questions(id,revision),
 UNIQUE(attempt_id,question_id,question_revision)
);
CREATE TABLE mistake_current (
 subject_id text NOT NULL REFERENCES subjects(id), question_id text NOT NULL, question_revision integer NOT NULL,
 status text NOT NULL CHECK(status IN ('needsReview','corrected')),
 latest_wrong_at TIMESTAMPTZ NOT NULL, latest_valid_answer_at TIMESTAMPTZ,
 PRIMARY KEY(subject_id,question_id,question_revision),
 FOREIGN KEY(question_id,question_revision) REFERENCES questions(id,revision)
);
CREATE TABLE watch_sessions (
 id text NOT NULL PRIMARY KEY, subject_id text NOT NULL REFERENCES subjects(id),
 revision_id text NOT NULL REFERENCES lesson_revisions(id), video_asset_id text NOT NULL,
 valid_ranges JSON NOT NULL DEFAULT '[]' CHECK(json_valid(valid_ranges)), max_playback_ms integer NOT NULL DEFAULT 0 CHECK(max_playback_ms>=0),
 last_position_ms integer NOT NULL DEFAULT 0 CHECK(last_position_ms>=0),
 sequence integer NOT NULL DEFAULT 0, credited_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT (now()), updated_at TIMESTAMPTZ NOT NULL DEFAULT (now())
);
CREATE TABLE lesson_progress (
 earned_n TEXT CHECK(shish_uint(earned_n)) NOT NULL DEFAULT 0 CHECK(earned_n>=0),
 earned_d TEXT CHECK(shish_uint(earned_d)) NOT NULL DEFAULT 1 CHECK(earned_d>0),
 current_score numeric NOT NULL DEFAULT 0 CHECK(current_score BETWEEN 0 AND 100),
 subject_id text NOT NULL REFERENCES subjects(id), lesson_id text NOT NULL REFERENCES lessons(id),
 effective_score numeric NOT NULL DEFAULT 0 CHECK(effective_score BETWEEN 0 AND 100),
 video_credited boolean NOT NULL DEFAULT false CHECK(video_credited IN (0,1)), threshold_reached_at TIMESTAMPTZ,
 unlocked_at TIMESTAMPTZ, last_activity_at TIMESTAMPTZ, current_revision text REFERENCES lesson_revisions(id),
 PRIMARY KEY(subject_id,lesson_id)
);
CREATE TABLE exercise_progress (
 earned_n TEXT CHECK(shish_uint(earned_n)) NOT NULL DEFAULT 0 CHECK(earned_n>=0),
 earned_d TEXT CHECK(shish_uint(earned_d)) NOT NULL DEFAULT 1 CHECK(earned_d>0),
 subject_id text NOT NULL REFERENCES subjects(id), stage_id text NOT NULL REFERENCES stages(id),
 best_attempt_id text REFERENCES learning_attempts(id), last_attempt_id text REFERENCES learning_attempts(id),
 earned_fraction numeric NOT NULL DEFAULT 0 CHECK(earned_fraction BETWEEN 0 AND 1),
 PRIMARY KEY(subject_id,stage_id)
);
CREATE TABLE purchases (
 provider text NOT NULL DEFAULT 'unconfigured',
 provider_ref text UNIQUE,
 request_hash text,
 return_lesson_id text REFERENCES lessons(id),
 expires_at TIMESTAMPTZ NOT NULL DEFAULT (shish_add_time(now(),'30 minutes')),
 id text NOT NULL PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), product_id text NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), currency text NOT NULL,
 status text NOT NULL CHECK(status IN ('pending','verified','failed','cancelled')),
 idempotency_key text NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT (now()),
 UNIQUE(user_id,idempotency_key)
);
CREATE TABLE payment_transactions (
 id text NOT NULL PRIMARY KEY, purchase_id text NOT NULL REFERENCES purchases(id),
 provider text NOT NULL, provider_payment_id text NOT NULL,
 status text NOT NULL, verified_at TIMESTAMPTZ, safe_metadata JSON NOT NULL DEFAULT '{}' CHECK(json_valid(safe_metadata)),
 UNIQUE(provider,provider_payment_id)
);
CREATE TABLE entitlements (
 id text NOT NULL PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), product_id text NOT NULL,
 source_purchase_id text NOT NULL REFERENCES purchases(id), granted_at TIMESTAMPTZ NOT NULL DEFAULT (now()),
 revoked_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX entitlement_active_unique ON entitlements(user_id,product_id) WHERE revoked_at IS NULL;
CREATE TABLE last_activity (
 subject_id text NOT NULL PRIMARY KEY REFERENCES subjects(id), lesson_id text NOT NULL REFERENCES lessons(id),
 stage_id text REFERENCES stages(id), draft_id text, source_route text,
 scroll_state JSON NOT NULL DEFAULT '{}' CHECK(json_valid(scroll_state)), updated_at TIMESTAMPTZ NOT NULL DEFAULT (now())
);
CREATE TABLE drafts (
 subject_id text NOT NULL REFERENCES subjects(id), stage_id text NOT NULL REFERENCES stages(id),
 local_version integer NOT NULL CHECK(local_version>=0), input JSON NOT NULL CHECK(json_valid(input)),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT (now()), PRIMARY KEY(subject_id,stage_id)
);
CREATE TABLE guest_imports (
 source_guest_id text REFERENCES subjects(id),
 summary JSON NOT NULL DEFAULT '{}' CHECK(json_valid(summary)),
 id text NOT NULL PRIMARY KEY, guest_batch_id text NOT NULL, target_user_id text NOT NULL REFERENCES users(id),
 status text NOT NULL CHECK(status IN ('pending','completed')), consent_at TIMESTAMPTZ,
 checksum text NOT NULL, completed_at TIMESTAMPTZ, UNIQUE(guest_batch_id,target_user_id)
);




CREATE INDEX mistakes_subject_time ON mistake_events(subject_id,event_at DESC);
CREATE INDEX attempts_subject_stage ON learning_attempts(subject_id,stage_id,completed_at);
















CREATE TABLE guest_sessions (
 token_hash text NOT NULL PRIMARY KEY,
 subject_id text NOT NULL REFERENCES subjects(id),
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT (now())
);
CREATE INDEX guest_session_subject ON guest_sessions(subject_id);

CREATE TABLE request_budgets (
 key text NOT NULL PRIMARY KEY,
 window_start TIMESTAMPTZ NOT NULL,
 count integer NOT NULL CHECK(count>0)
);






CREATE TABLE attempt_receipts (
 attempt_id text NOT NULL PRIMARY KEY REFERENCES learning_attempts(id),
 outcome JSON NOT NULL CHECK(json_valid(outcome))
);


CREATE TABLE auth_challenges (
 id text NOT NULL PRIMARY KEY, phone text NOT NULL, purpose text NOT NULL CHECK(purpose IN ('login','recover')),
 code_hash text NOT NULL, expires_at TIMESTAMPTZ NOT NULL, resend_after TIMESTAMPTZ NOT NULL,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0), consumed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT (now())
);
CREATE INDEX auth_phone_cooldown ON auth_challenges(phone,purpose,created_at DESC);
CREATE TABLE recovery_grants (
 token_hash text NOT NULL PRIMARY KEY, phone text NOT NULL, expires_at TIMESTAMPTZ NOT NULL, consumed_at TIMESTAMPTZ
);



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
 input JSON NOT NULL CHECK(json_valid(input)), updated_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(import_id,stage_id)
);






CREATE TABLE selected_context (
 subject_id text NOT NULL PRIMARY KEY REFERENCES subjects(id), lesson_id text NOT NULL REFERENCES lessons(id),
 stage_id text NOT NULL REFERENCES stages(id), updated_at TIMESTAMPTZ NOT NULL DEFAULT (now())
);
CREATE TABLE support_reports (
 id text NOT NULL PRIMARY KEY, subject_id text NOT NULL REFERENCES subjects(id),
 message text NOT NULL CHECK(length(message) BETWEEN 5 AND 1000),
 lesson_id text REFERENCES lessons(id), stage_id text REFERENCES stages(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT (now())
);

CREATE TABLE avatar_assets (
 id TEXT PRIMARY KEY, user_id text NOT NULL REFERENCES users(id),
 media_type text NOT NULL CHECK(media_type='image/png'),
 byte_size integer NOT NULL CHECK(byte_size BETWEEN 1 AND 2097152),
 created_at TIMESTAMPTZ NOT NULL DEFAULT (now())
);






CREATE TABLE payment_events (
 id TEXT PRIMARY KEY, purchase_id text NOT NULL REFERENCES purchases(id),
 outcome text NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT (now())
);

CREATE TRIGGER learning_attempts_update_immutable BEFORE UPDATE ON learning_attempts BEGIN SELECT RAISE(ABORT, 'immutable historical record'); END;
CREATE TRIGGER learning_attempts_delete_immutable BEFORE DELETE ON learning_attempts BEGIN SELECT RAISE(ABORT, 'immutable historical record'); END;
CREATE TRIGGER question_results_update_immutable BEFORE UPDATE ON question_results BEGIN SELECT RAISE(ABORT, 'immutable historical record'); END;
CREATE TRIGGER question_results_delete_immutable BEFORE DELETE ON question_results BEGIN SELECT RAISE(ABORT, 'immutable historical record'); END;
CREATE TRIGGER mistake_events_update_immutable BEFORE UPDATE ON mistake_events BEGIN SELECT RAISE(ABORT, 'immutable historical record'); END;
CREATE TRIGGER mistake_events_delete_immutable BEFORE DELETE ON mistake_events BEGIN SELECT RAISE(ABORT, 'immutable historical record'); END;
CREATE TRIGGER attempt_receipts_update_immutable BEFORE UPDATE ON attempt_receipts BEGIN SELECT RAISE(ABORT, 'immutable historical record'); END;
CREATE TRIGGER attempt_receipts_delete_immutable BEFORE DELETE ON attempt_receipts BEGIN SELECT RAISE(ABORT, 'immutable historical record'); END;
CREATE TRIGGER payment_transactions_update_immutable BEFORE UPDATE ON payment_transactions BEGIN SELECT RAISE(ABORT, 'immutable historical record'); END;
CREATE TRIGGER payment_transactions_delete_immutable BEFORE DELETE ON payment_transactions BEGIN SELECT RAISE(ABORT, 'immutable historical record'); END;
CREATE TRIGGER payment_events_update_immutable BEFORE UPDATE ON payment_events BEGIN SELECT RAISE(ABORT, 'immutable historical record'); END;
CREATE TRIGGER payment_events_delete_immutable BEFORE DELETE ON payment_events BEGIN SELECT RAISE(ABORT, 'immutable historical record'); END;
CREATE TRIGGER user_kind_insert BEFORE INSERT ON users WHEN NOT EXISTS(SELECT 1 FROM subjects WHERE id=NEW.id AND kind='user') BEGIN SELECT RAISE(ABORT, 'user must reference a user subject'); END;
CREATE TRIGGER user_kind_update BEFORE UPDATE ON users WHEN NOT EXISTS(SELECT 1 FROM subjects WHERE id=NEW.id AND kind='user') BEGIN SELECT RAISE(ABORT, 'user must reference a user subject'); END;
CREATE TRIGGER revision_update_immutable BEFORE UPDATE ON lesson_revisions WHEN OLD.published_at IS NOT NULL BEGIN SELECT RAISE(ABORT, 'published revision is immutable'); END;
CREATE TRIGGER revision_delete_immutable BEFORE DELETE ON lesson_revisions WHEN OLD.published_at IS NOT NULL BEGIN SELECT RAISE(ABORT, 'published revision is immutable'); END;
CREATE TRIGGER stages_insert_immutable BEFORE INSERT ON stages WHEN EXISTS(SELECT 1 FROM lesson_revisions WHERE id=NEW.revision_id AND published_at IS NOT NULL) BEGIN SELECT RAISE(ABORT, 'published stages is immutable'); END;
CREATE TRIGGER stages_update_immutable BEFORE UPDATE ON stages WHEN EXISTS(SELECT 1 FROM lesson_revisions WHERE id=OLD.revision_id AND published_at IS NOT NULL) OR EXISTS(SELECT 1 FROM lesson_revisions WHERE id=NEW.revision_id AND published_at IS NOT NULL) BEGIN SELECT RAISE(ABORT, 'published stages is immutable'); END;
CREATE TRIGGER stages_delete_immutable BEFORE DELETE ON stages WHEN EXISTS(SELECT 1 FROM lesson_revisions WHERE id=OLD.revision_id AND published_at IS NOT NULL) BEGIN SELECT RAISE(ABORT, 'published stages is immutable'); END;
CREATE TRIGGER questions_insert_immutable BEFORE INSERT ON questions WHEN EXISTS(SELECT 1 FROM stages s JOIN lesson_revisions r ON r.id=s.revision_id WHERE s.id=NEW.stage_id AND r.published_at IS NOT NULL) BEGIN SELECT RAISE(ABORT, 'published questions is immutable'); END;
CREATE TRIGGER questions_update_immutable BEFORE UPDATE ON questions WHEN EXISTS(SELECT 1 FROM stages s JOIN lesson_revisions r ON r.id=s.revision_id WHERE s.id=OLD.stage_id AND r.published_at IS NOT NULL) OR EXISTS(SELECT 1 FROM stages s JOIN lesson_revisions r ON r.id=s.revision_id WHERE s.id=NEW.stage_id AND r.published_at IS NOT NULL) BEGIN SELECT RAISE(ABORT, 'published questions is immutable'); END;
CREATE TRIGGER questions_delete_immutable BEFORE DELETE ON questions WHEN EXISTS(SELECT 1 FROM stages s JOIN lesson_revisions r ON r.id=s.revision_id WHERE s.id=OLD.stage_id AND r.published_at IS NOT NULL) BEGIN SELECT RAISE(ABORT, 'published questions is immutable'); END;
