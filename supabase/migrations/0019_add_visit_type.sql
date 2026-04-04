-- Migration 0019: add type column to visits
-- EP-031.1

ALTER TABLE visits
  ADD COLUMN type TEXT NOT NULL DEFAULT 'visit'
    CHECK (type IN ('sale', 'visit', 'call', 'quote'));
