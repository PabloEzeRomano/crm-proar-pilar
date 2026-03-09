-- Replace contact_name / phone / email columns with a contacts JSONB array.

ALTER TABLE clients ADD COLUMN contacts JSONB NOT NULL DEFAULT '[]';

-- Migrate existing single contact into first element of the array
UPDATE clients
SET contacts = jsonb_build_array(
  jsonb_strip_nulls(jsonb_build_object(
    'name',  contact_name,
    'phone', phone,
    'email', email
  ))
)
WHERE contact_name IS NOT NULL
   OR phone        IS NOT NULL
   OR email        IS NOT NULL;

ALTER TABLE clients DROP COLUMN contact_name;
ALTER TABLE clients DROP COLUMN phone;
ALTER TABLE clients DROP COLUMN email;
