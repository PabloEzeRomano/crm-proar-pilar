-- Migration 0053: Email templates and send history for gemm pipeline CRM
-- email_templates: user-created templates with {{variable}} placeholders
-- email_sends: one row per email sent (audit log + prospect history)

-- ── email_templates ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by   UUID NOT NULL REFERENCES auth.users(id),
  name         TEXT NOT NULL,
  subject      TEXT NOT NULL,
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_templates_select" ON public.email_templates
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "email_templates_insert" ON public.email_templates
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "email_templates_update" ON public.email_templates
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "email_templates_delete" ON public.email_templates
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- ── email_sends ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_sends (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL,
  sender_user_id      UUID NOT NULL REFERENCES auth.users(id),
  template_id         UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  template_name       TEXT NOT NULL,
  prospect_id         UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  recipient_email     TEXT NOT NULL,
  recipient_name      TEXT,
  subject             TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  resend_message_id   TEXT,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_sends_select" ON public.email_sends
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "email_sends_insert" ON public.email_sends
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- ── Index for prospect history lookups ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS email_sends_prospect_id_idx
  ON public.email_sends(prospect_id, created_at DESC);

CREATE INDEX IF NOT EXISTS email_sends_company_id_idx
  ON public.email_sends(company_id, created_at DESC);
