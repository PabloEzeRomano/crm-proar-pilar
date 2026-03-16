-- =============================================================================
-- 0011_email_sender_from_auth.sql
-- Extracts email local part (before @) from auth.users.email and stores as
-- sender_address and sender_name in email_config for multi-user white-label.
-- For example: gvega@proarpilar.com → gvega@send.gemm-apps.com / gvega
-- =============================================================================

-- Update the handle_new_user trigger to extract email local part and populate
-- sender_address / sender_name automatically
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  email_local_part TEXT;
BEGIN
  -- Extract the part before @ from the user's email
  email_local_part := SPLIT_PART(NEW.email, '@', 1);

  INSERT INTO public.profiles (id, full_name, email_config)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    jsonb_build_object(
      'sender', NULL,
      'recipients', '[]'::jsonb,
      'enabled', false,
      'sender_address', email_local_part || '@send.gemm-apps.com',
      'sender_name', email_local_part
    )
  );
  RETURN NEW;
END;
$$;

-- Migrate existing profiles: add sender_address and sender_name from auth.users.email
-- This update is safe because it only affects profiles that don't already have these fields
UPDATE public.profiles p
SET email_config =
  CASE
    WHEN email_config->>'sender_address' IS NOT NULL THEN
      email_config
    ELSE
      email_config || jsonb_build_object(
        'sender_address', SPLIT_PART(u.email, '@', 1) || '@send.gemm-apps.com',
        'sender_name', SPLIT_PART(u.email, '@', 1)
      )
  END
FROM auth.users u
WHERE p.id = u.id;
