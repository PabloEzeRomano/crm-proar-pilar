-- Migration 0038: Add product_manager to user_role enum
-- Must be in its own transaction — Postgres cannot use new enum values
-- in the same transaction that adds them.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'product_manager';
