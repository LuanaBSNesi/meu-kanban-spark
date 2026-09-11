-- Stamp updated_at in the database so it never depends on the caller's clock.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER boards_set_updated_at BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER lists_set_updated_at BEFORE UPDATE ON lists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER cards_set_updated_at BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
-- Repair rows already written with a skewed client clock.
UPDATE cards SET updated_at = greatest(updated_at, created_at);
--> statement-breakpoint
UPDATE lists SET updated_at = greatest(updated_at, created_at);
--> statement-breakpoint
UPDATE boards SET updated_at = greatest(updated_at, created_at);
