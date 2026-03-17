-- EP-016: Add last_visited_at column to clients table
ALTER TABLE clients ADD COLUMN last_visited_at TIMESTAMPTZ;

-- Backfill existing rows with the max scheduled_at from their visits
UPDATE clients SET last_visited_at = (
  SELECT MAX(scheduled_at) FROM visits
  WHERE visits.client_id = clients.id
    AND visits.owner_user_id = clients.owner_user_id
);

-- Trigger function: updates client.last_visited_at when visits are inserted/updated/deleted
CREATE OR REPLACE FUNCTION fn_update_client_last_visited()
RETURNS TRIGGER AS $$
DECLARE target_client_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_client_id := OLD.client_id;
  ELSE
    target_client_id := NEW.client_id;
  END IF;

  UPDATE clients SET last_visited_at = (
    SELECT MAX(scheduled_at) FROM visits
    WHERE client_id = target_client_id
  )
  WHERE id = target_client_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for visits table
CREATE TRIGGER trg_visits_update_last_visited
  AFTER INSERT OR UPDATE OR DELETE ON visits
  FOR EACH ROW EXECUTE FUNCTION fn_update_client_last_visited();
