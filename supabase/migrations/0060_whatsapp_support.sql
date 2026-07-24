-- 0060_whatsapp_support.sql
-- Adds WhatsApp channel support:
--   1. channel column on email_templates (email | whatsapp)
--   2. whatsapp_instance + whatsapp_connected on company_config
--   3. whatsapp_sends table

-- ── 1. Templates: add channel ─────────────────────────────────────────────────

ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email'
  CHECK (channel IN ('email', 'whatsapp'));

-- ── 2. Company config: whatsapp instance ─────────────────────────────────────

ALTER TABLE public.company_config
  ADD COLUMN IF NOT EXISTS whatsapp_instance TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_connected BOOLEAN NOT NULL DEFAULT false;

-- ── 3. whatsapp_sends ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.whatsapp_sends (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID NOT NULL REFERENCES public.companies(id),
  sender_user_id       UUID NOT NULL REFERENCES auth.users(id),
  prospect_id          UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  template_id          UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  recipient_phone      TEXT NOT NULL,
  recipient_name       TEXT,
  body                 TEXT NOT NULL,
  evolution_message_id TEXT,
  status               TEXT NOT NULL DEFAULT 'sent'
                       CHECK (status IN ('sent', 'failed')),
  error_message        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_sends_company_select ON public.whatsapp_sends
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY whatsapp_sends_company_insert ON public.whatsapp_sends
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS whatsapp_sends_prospect_idx
  ON public.whatsapp_sends (prospect_id)
  WHERE prospect_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS whatsapp_sends_company_created_idx
  ON public.whatsapp_sends (company_id, created_at DESC);
