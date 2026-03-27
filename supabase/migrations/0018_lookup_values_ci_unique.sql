-- Migration 0019: case-insensitive deduplication + insert policy for lookup_values
-- All statements are idempotent — safe to run even if a previous migration
-- already modified lookup_values.

-- Drop the existing case-sensitive unique constraint (no-op if already dropped)
ALTER TABLE lookup_values
  DROP CONSTRAINT IF EXISTS lookup_values_type_value_unique;

-- Remove case-insensitive duplicates before creating the new index
DELETE FROM lookup_values a
  USING lookup_values b
  WHERE a.id > b.id
    AND a.type = b.type
    AND LOWER(a.value) = LOWER(b.value);

-- Add case-insensitive unique index (no-op if already exists)
CREATE UNIQUE INDEX IF NOT EXISTS lookup_values_type_lower_value_idx
  ON lookup_values (type, LOWER(value));

-- Allow authenticated users to insert new lookup values (inline add from client form)
-- Drop first to avoid "already exists" error if a previous migration created it
DROP POLICY IF EXISTS "Authenticated users can insert lookup values" ON lookup_values;
CREATE POLICY "Authenticated users can insert lookup values"
  ON lookup_values FOR INSERT
  TO authenticated
  WITH CHECK (true);
