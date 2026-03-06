-- =============================================================================
-- 0006_pg_cron_weekly_email.sql
--
-- Intentionally left as a no-op.
--
-- Reason:
-- The weekly-email schedule is managed directly in Supabase Cron Dashboard
-- instead of SQL migrations, to avoid hardcoding project-specific HTTP config
-- and secrets in versioned migration files.
-- =============================================================================

select 1;