-- EP-020: Add latitude and longitude columns to clients table for distance-based sorting
ALTER TABLE clients
  ADD COLUMN latitude DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION;
