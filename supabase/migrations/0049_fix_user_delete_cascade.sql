-- Fix FK constraints that block permanent user deletion.
--
-- client_assignments.assigned_to / assigned_by and interactions.user_id
-- were created with ON DELETE NO ACTION, which causes auth.admin.deleteUser()
-- to fail with a FK violation when the user has any assignments or interactions.
--
-- • assigned_to / user_id → CASCADE: rows belong to that user, delete them too.
-- • assigned_by            → SET NULL: keep the assignment, clear who assigned it.

ALTER TABLE public.client_assignments
  DROP CONSTRAINT client_assignments_assigned_to_fkey,
  ADD CONSTRAINT client_assignments_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.client_assignments
  DROP CONSTRAINT client_assignments_assigned_by_fkey,
  ADD CONSTRAINT client_assignments_assigned_by_fkey
    FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.interactions
  DROP CONSTRAINT interactions_user_id_fkey,
  ADD CONSTRAINT interactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
