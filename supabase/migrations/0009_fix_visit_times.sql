-- Fix visits imported with midnight artifact time (00:00:48 local)
-- instead of the intended 10:00 default.
--
-- Selects visits whose local time (America/Argentina/Buenos_Aires) is
-- between 00:00:00 and 00:01:00 (the artifact window) and resets them
-- to 10:00 local time.

UPDATE visits
SET scheduled_at = (
  date_trunc('day', scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires')
  + interval '10 hours'
) AT TIME ZONE 'America/Argentina/Buenos_Aires'
WHERE
  EXTRACT(hour   FROM scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires') = 0
  AND EXTRACT(minute FROM scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires') = 0;
