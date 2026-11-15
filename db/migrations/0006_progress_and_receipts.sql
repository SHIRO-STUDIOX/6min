ALTER TABLE exercise_progress ADD COLUMN earned_n numeric(200,0) NOT NULL DEFAULT 0 CHECK(earned_n>=0);
ALTER TABLE exercise_progress ADD COLUMN earned_d numeric(200,0) NOT NULL DEFAULT 1 CHECK(earned_d>0);
ALTER TABLE lesson_progress ADD COLUMN earned_n numeric(200,0) NOT NULL DEFAULT 0 CHECK(earned_n>=0);
ALTER TABLE lesson_progress ADD COLUMN earned_d numeric(200,0) NOT NULL DEFAULT 1 CHECK(earned_d>0);
ALTER TABLE lesson_progress ADD COLUMN current_score numeric NOT NULL DEFAULT 0 CHECK(current_score BETWEEN 0 AND 100);
CREATE TABLE attempt_receipts (
 attempt_id text PRIMARY KEY REFERENCES learning_attempts(id),
 outcome jsonb NOT NULL
);
CREATE TRIGGER receipt_immutable BEFORE UPDATE OR DELETE ON attempt_receipts FOR EACH ROW EXECUTE FUNCTION protect_history();
