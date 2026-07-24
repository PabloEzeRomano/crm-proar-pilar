-- Add credited_amount to interactions for "Califica" flow (interested / follow_up)
ALTER TABLE public.interactions
  ADD COLUMN IF NOT EXISTS credited_amount NUMERIC DEFAULT NULL;
