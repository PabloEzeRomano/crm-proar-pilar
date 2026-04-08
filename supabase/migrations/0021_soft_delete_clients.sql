-- Migration: 0021_soft_delete_clients.sql
-- Add soft-delete support to clients table.
-- Filtering (deleted_at IS NULL) is handled at the store level.

ALTER TABLE clients
  ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
