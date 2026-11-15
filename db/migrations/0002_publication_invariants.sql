ALTER TABLE lesson_revisions ADD CONSTRAINT revision_lesson_pair UNIQUE(id,lesson_id);
ALTER TABLE lessons ADD CONSTRAINT current_revision_belongs_to_lesson FOREIGN KEY(current_revision_id,id) REFERENCES lesson_revisions(id,lesson_id);

CREATE FUNCTION protect_published_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.published_at IS NOT NULL THEN RAISE EXCEPTION 'published revision is immutable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER revision_immutable BEFORE UPDATE OR DELETE ON lesson_revisions FOR EACH ROW EXECUTE FUNCTION protect_published_revision();

CREATE FUNCTION require_user_subject() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM subjects WHERE id=NEW.id AND kind='user') THEN
  RAISE EXCEPTION 'user must reference a user subject';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER user_subject_kind BEFORE INSERT OR UPDATE ON users FOR EACH ROW EXECUTE FUNCTION require_user_subject();
