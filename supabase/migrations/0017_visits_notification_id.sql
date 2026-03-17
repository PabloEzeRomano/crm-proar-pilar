-- =============================================================================
-- 0017_visits_notification_id.sql
-- Adds notification_id column to visits table for notification tracking.
-- Allows app to track and cancel scheduled notifications if visits are
-- rescheduled or deleted.
-- =============================================================================

-- Add nullable notification_id column to track scheduled notifications
ALTER TABLE public.visits
  ADD COLUMN notification_id TEXT;

-- Comment explaining the column purpose
COMMENT ON COLUMN public.visits.notification_id IS
  'Stores the ID of a scheduled notification for this visit. '
  'Used to track and cancel notifications when visits are rescheduled or deleted. '
  'NULL if the visit has no scheduled notification.';
