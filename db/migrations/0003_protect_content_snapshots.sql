CREATE FUNCTION protect_published_stage() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP <> 'INSERT' AND EXISTS(SELECT 1 FROM lesson_revisions WHERE id=OLD.revision_id AND published_at IS NOT NULL) THEN
  RAISE EXCEPTION 'published stage is immutable';
 END IF;
 IF TG_OP <> 'DELETE' AND EXISTS(SELECT 1 FROM lesson_revisions WHERE id=NEW.revision_id AND published_at IS NOT NULL) THEN
  RAISE EXCEPTION 'published stage is immutable';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER stage_immutable BEFORE INSERT OR UPDATE OR DELETE ON stages FOR EACH ROW EXECUTE FUNCTION protect_published_stage();

CREATE FUNCTION protect_published_question() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP <> 'INSERT' AND EXISTS(SELECT 1 FROM stages s JOIN lesson_revisions r ON r.id=s.revision_id WHERE s.id=OLD.stage_id AND r.published_at IS NOT NULL) THEN
  RAISE EXCEPTION 'published question is immutable';
 END IF;
 IF TG_OP <> 'DELETE' AND EXISTS(SELECT 1 FROM stages s JOIN lesson_revisions r ON r.id=s.revision_id WHERE s.id=NEW.stage_id AND r.published_at IS NOT NULL) THEN
  RAISE EXCEPTION 'published question is immutable';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER question_immutable BEFORE INSERT OR UPDATE OR DELETE ON questions FOR EACH ROW EXECUTE FUNCTION protect_published_question();
