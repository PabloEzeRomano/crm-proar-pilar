-- Migration 0048: Add thread_id to visits for Seguimiento feature
--
-- thread_id groups related follow-up visits under the same topic.
-- Convention: the first visit in a thread has thread_id = its own id.
-- All follow-ups share the same thread_id as the original visit.

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS thread_id UUID;

COMMENT ON COLUMN public.visits.thread_id IS
  'Groups related follow-up visits under a single topic/thread. First visit: thread_id = its own id. Follow-ups: inherit same thread_id.';

CREATE INDEX IF NOT EXISTS idx_visits_thread_id ON public.visits(thread_id)
  WHERE thread_id IS NOT NULL;
