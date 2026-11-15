CREATE TRIGGER payment_transaction_immutable BEFORE UPDATE OR DELETE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER payment_event_immutable BEFORE UPDATE OR DELETE ON payment_events FOR EACH ROW EXECUTE FUNCTION protect_history();
