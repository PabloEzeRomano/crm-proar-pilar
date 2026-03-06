-- =============================================================================
-- 0007_profiles_show_tour.sql
--
-- Adds show_tour flag to profiles.
-- When TRUE the app shows the onboarding tour on next launch.
-- Defaults to TRUE so new users always see the tour.
-- =============================================================================

alter table profiles
  add column if not exists show_tour boolean not null default true;
