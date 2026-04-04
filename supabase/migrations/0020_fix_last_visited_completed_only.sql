-- EP fix: last_visited_at should only consider completed visits, not pending/canceled

-- Fix the trigger function
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
      AND status = 'completed'
  )
  WHERE id = target_client_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing data: recalculate using completed visits only
UPDATE clients SET last_visited_at = (
  SELECT MAX(scheduled_at) FROM visits
  WHERE visits.client_id = clients.id
    AND visits.owner_user_id = clients.owner_user_id
    AND visits.status = 'completed'
);
