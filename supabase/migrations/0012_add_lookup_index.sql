-- Add index on lookup_values(type) for faster picker queries
-- Pickers query this table frequently by type (e.g., WHERE type = 'rubro')

CREATE INDEX IF NOT EXISTS lookup_values_type_idx ON lookup_values(type);
