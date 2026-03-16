# Backlog — CRM Proar Pilar

> Status: `pending` | `in_progress` | `reviewing` | `done` | `blocked`
> Agents: `backend` | `frontend` | `state` | `scripts` | `ui-ux` | `pm-tl`

---

## EP-000 — Design System

> Must be completed before any frontend work starts.

| # | Story | Agent | Status |
|---|---|---|---|
| 0.1 | Define design tokens in `/constants/theme.ts` (colors, typography, spacing, radius) | ui-ux | `done` |
| 0.2 | Create white-label config in `/constants/brand.ts` (appName, primaryColor, logoUrl) | ui-ux | `done` |
| 0.3 | Document component specs: Button, Card, Input, Badge, StatusBadge, Banner | ui-ux | `done` |
| 0.4 | Define navigation structure and tab bar visual spec | ui-ux | `done` |

---

## EP-001 — Project Setup

| # | Story | Agent | Status |
|---|---|---|---|
| 1.1 | Initialize Expo project with TypeScript and Expo Router | pm-tl | `done` |
| 1.2 | Set up Supabase project and store credentials in `.env` | backend | `done` |
| 1.3 | Configure `supabase-js` client singleton in `/lib/supabase.ts` | state | `done` |
| 1.4 | Configure `dayjs` with locale in `/lib/dayjs.ts` | state | `done` |
| 1.5 | Set up folder structure as defined in CLAUDE.md | pm-tl | `done` |
| 1.6 | Install and configure all dependencies (zustand, zod, dayjs, etc.) | pm-tl | `done` |

---

## EP-002 — Database & RLS

| # | Story | Agent | Status |
|---|---|---|---|
| 2.1 | Create `profiles` table + RLS policies | backend | `done` |
| 2.2 | Create `clients` table + RLS policies | backend | `done` |
| 2.3 | Create `visits` table + RLS policies | backend | `done` |
| 2.4 | Create `updated_at` trigger function (reusable) | backend | `done` |
| 2.5 | Seed test user via Supabase Auth (dev only) | backend | `done` |

---

## EP-003 — Auth

| # | Story | Agent | Status |
|---|---|---|---|
| 3.1 | Create `authStore` (session, user, login, logout) | state | `done` |
| 3.2 | Build Login screen (`/(auth)/login.tsx`) | frontend | `done` |
| 3.3 | Protect routes: redirect to login if no session | frontend | `done` |
| 3.4 | Auto-restore session on app launch | state | `done` |
| 3.5 | Create/upsert profile row on first login | state | `done` |

---

## EP-004 — Clients

| # | Story | Agent | Status |
|---|---|---|---|
| 4.1 | Create `clientsStore` (list, create, update, delete) | state | `done` |
| 4.2 | Create `useClients` hook | state | `done` |
| 4.3 | Build Clients list screen with search | frontend | `done` |
| 4.4 | Build Client detail screen | frontend | `done` |
| 4.5 | Build Create/Edit client form with Zod validation | frontend | `done` |
| 4.6 | "Open in Google Maps" button (address + city) | frontend | `done` |

---

## EP-005 — Visits

| # | Story | Agent | Status |
|---|---|---|---|
| 5.1 | Create `visitsStore` (list by client, create, update) | state | `done` |
| 5.2 | Create `useVisits` hook | state | `done` |
| 5.3 | Build Visit detail / notes screen | frontend | `done` |
| 5.4 | Build Create/Edit visit form with Zod validation | frontend | `done` |
| 5.5 | Status update flow (pending → completed / canceled) | frontend | `done` |
| 5.6 | Show visit history on Client detail screen | frontend | `done` |

---

## EP-006 — Today Dashboard

| # | Story | Agent | Status |
|---|---|---|---|
| 6.1 | Create `todayStore` with today's visits + clients | state | `done` |
| 6.2 | Offline cache: persist today's data to AsyncStorage | state | `done` |
| 6.3 | Auto-refresh every 60 seconds while screen is active | state | `done` |
| 6.4 | Build Today screen: list of today's appointments | frontend | `done` |
| 6.5 | "Next appointment" banner with countdown | frontend | `done` |
| 6.6 | "Overdue by X minutes" state when past scheduled time | frontend | `done` |
| 6.7 | Offline banner when showing cached data | frontend | `done` |

---

## EP-007 — Data Import

| # | Story | Agent | Status |
|---|---|---|---|
| 7.1 | Write `import-excel.ts` script with column mapping | scripts | `done` |
| 7.2 | Client deduplication logic (name + address) | scripts | `done` |
| 7.3 | Visit creation logic (rows with Fecha) | scripts | `done` |
| 7.4 | Default time 10:00 for rows without time in Fecha | scripts | `done` |
| 7.5 | Dry-run mode: log what would be inserted without writing | scripts | `done` |
| 7.6 | In-app import from Settings screen (importStore + expo-document-picker) | frontend | `done` |
| 7.7 | Run import against dev Supabase and verify data | pm-tl | `done` |
| 7.8 | Fix `hasExplicitTime` check: use local hour/minute instead of UTC (Excel midnight artifact) | scripts + state | `done` |
| 7.9 | Fix visit status: compare against `startOf('day')` so today's imports are `pending` | scripts + state | `done` |
| 7.10 | Stagger visit times by gap within the same day (`dayLastTimeMap`); reads gap from AsyncStorage | scripts + state | `done` |
| 7.11 | Parse multi-value phone/email cells (split on `\n`, `/`, `,`) into structured `ContactInfo[]` | scripts + state | `done` |
| 7.12 | Extract contact names from parentheses and leading text in phone cells | scripts | `done` |

---

## EP-008 — Weekly Email Summary

| # | Story | Agent | Status |
|---|---|---|---|
| 8.1 | Store email config in `profiles.email_config` (sender, recipients, enabled) | backend | `done` |
| 8.2 | Build Supabase Edge Function: query last week's visits | backend | `done` |
| 8.3 | Generate HTML email with client name, date, notes | backend | `done` |
| 8.4 | Send via Resend API | backend | `done` |
| 8.5 | Schedule function with pg_cron (every Monday 08:00) | backend | `done` |
| 8.6 | Settings screen: configure sender + recipients | frontend | `done` |

---

## EP-009 — Onboarding Tour

| # | Story | Agent | Status |
|---|---|---|---|
| 9.1 | Migration: add `show_tour BOOLEAN DEFAULT TRUE` to `profiles` | backend | `done` |
| 9.2 | Add `completeTour` / `resetTour` actions to `authStore` | state | `done` |
| 9.3 | Build `OnboardingTour` modal component (5 steps) | frontend | `done` |
| 9.4 | Show tour from root layout when `profile.show_tour = true` | frontend | `done` |
| 9.5 | "Ver tour de nuevo" button in Settings | frontend | `done` |

---

## EP-010 — Email Sending Strategy

| # | Story | Agent | Status |
|---|---|---|---|
| 10.1 | Use `MAIL_FROM_NAME` / `MAIL_FROM_ADDRESS` env vars for `from` field | backend | `done` |
| 10.2 | Use `email_config.sender` as `reply_to` (user's personal/business email) | backend | `done` |
| 10.3 | Update Settings label: "Email remitente" → "Tu email (para respuestas)" | frontend | `done` |
| 10.4 | Extract email name from auth email → populate sender_address/sender_name in email_config (multi-user ready) | backend + frontend + state | `done` |

---

---

## EP-011 — Navigation: Back to Agenda from Visit Detail

| # | Story | Agent | Status |
|---|---|---|---|
| 11.1 | Pass `from=agenda` query param when navigating to `/visits/[id]` from Agenda screen | frontend | `done` |
| 11.2 | Visit detail reads `from` param; if `agenda` → custom back button navigates to `/(tabs)/` | frontend | `done` |

> Post-MVP: investigate proper shared stack context so back always works naturally.

---

## EP-012 — Shared Lookup Values (Rubro / Localidad)

| # | Story | Agent | Status |
|---|---|---|---|
| 12.1 | Migration: create `lookup_values` table `(id, type TEXT, value TEXT, UNIQUE(type,value))` — no `owner_user_id`, readable by all authenticated users | backend | `done` |
| 12.2 | Seed migration: populate from distinct `industry` and `city` values already in `clients` table | backend | `done` |
| 12.3 | Create `lookupsStore` with `fetchLookups()` — loads all lookup values, cached in AsyncStorage | state | `done` |
| 12.4 | Bootstrap `fetchLookups()` in root layout alongside clients/visits on app open | state | `done` |
| 12.5 | Replace free-text `industry` and `city` inputs in client form with Select pickers backed by lookup lists | frontend | `done` |
| 12.6 | Add Rubro and Localidad filter pills above the clients list | frontend | `done` |

---

## EP-013 — Visit Defaults & Status Logic

| # | Story | Agent | Status |
|---|---|---|---|
| 13.1 | Verify & fix: visits created or imported with `date >= today` default to `pending`; past dates default to `completed` | frontend + scripts | `done` |
| 13.2 | Default visit time logic: find the latest visit on the selected date in the store → `latest_time + gap`; no visits that day → 10:00 | frontend | `done` |
| 13.3 | Visit gap preference stored in AsyncStorage (default: 60 min) | state | `done` |
| 13.4 | Gap picker in visit creation/edit form: 30 min / 1 h / 1.5 h / 2 h | frontend | `done` |

---

## EP-014 — Contacts Refactor

| # | Story | Agent | Status |
|---|---|---|---|
| 14.1 | Replace `contact_name`/`phone`/`email` columns with `contacts JSONB` (`ContactInfo[]`) — migration 0010 | backend | `done` |
| 14.2 | Add `ContactInfo` type and update `Client` interface in `types/index.ts` | state | `done` |
| 14.3 | Update `validators/client.ts` with `contactInfoSchema` and `contacts` field | state | `done` |
| 14.4 | Update `clientsStore` to pass `contacts` through create/update | state | `done` |
| 14.5 | Client detail: render `contacts[]` as tappable cards (Llamar / WhatsApp / mailto) | frontend | `done` |
| 14.6 | Client form: dynamic contact cards (name/phone/email per card, add/remove) | frontend | `done` |
| 14.7 | Run migration 0010 in Supabase and re-import with clean data | pm-tl | `done` |

---

## EP-015 — Android APK Build (EAS)

| # | Story | Agent | Status |
|---|---|---|---|
| 15.1 | Add `android.package` to `app.json` | pm-tl | `done` |
| 15.2 | Create `eas.json` with `preview` (APK) and `production` (AAB) profiles | pm-tl | `done` |
| 15.3 | Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` as EAS secrets | pm-tl | `done` |
| 15.4 | Build and install APK on device via `eas build -p android --profile preview` | pm-tl | `done` |

---

## EP-016 — Client Health & Activity Indicators

| # | Story | Agent | Status |
|---|---|---|---|
| 16.1 | Show "last visited X days ago" badge on client card (color-coded: green <30d, amber 30-60d, red >60d) | frontend | `pending` |
| 16.2 | Add "Sin visita en 30/60/90 días" filter option to client filter modal | frontend | `pending` |
| 16.3 | Add `fetchVisitsByClient` bypass for pagination so all client visits are loaded in detail screen | state | `done` |

---

## EP-017 — UX Quick Wins

| # | Story | Agent | Status |
|---|---|---|---|
| 17.1 | WhatsApp pre-filled greeting: add `?text=Hola [name]!` to `wa.me` URL; handle Argentina +549 prefix | frontend | `pending` |
| 17.2 | Structured minuta template: pre-fill empty notes with "Objetivo / Resultado / Próximos pasos" | frontend | `pending` |
| 17.3 | "Visitar hoy" one-tap button on client detail: creates visit at smart default time, skips if already exists | frontend + state | `pending` |
| 17.4 | Dev-only "Borrar clientes y visitas" button in Settings (guarded by `__DEV__`) | frontend | `done` |

---

## EP-018 — Visit Statistics

| # | Story | Agent | Status |
|---|---|---|---|
| 18.1 | Visits this week / month count, completion rate — computed from `visitsStore` | state | `pending` |
| 18.2 | Top clients by visit frequency | state | `pending` |
| 18.3 | Statistics UI — collapsible card on Today screen or dedicated section | frontend | `pending` |

---

## EP-019 — Onboarding Tour v2

| # | Story | Agent | Status |
|---|---|---|---|
| 19.1 | Point tour steps at actual UI elements (tooltips/highlights, not just modals) | frontend | `pending` |
| 19.2 | Add import Excel/CSV step to tour flow | frontend | `pending` |
| 19.3 | Add contact-tap demo step (show Llamar / WhatsApp) | frontend | `pending` |

---

## EP-020 — Agenda by Distance

| # | Story | Agent | Status |
|---|---|---|---|
| 20.1 | Request device location permission | frontend | `pending` |
| 20.2 | Add `latitude` / `longitude` columns to `clients` (nullable) | backend | `pending` |
| 20.3 | Geocode client address + city on save (Google Maps / OpenStreetMap API) | state | `pending` |
| 20.4 | Sort today's agenda by distance from current location | frontend | `pending` |
| 20.5 | "Optimize route" button on Today screen | frontend | `pending` |

---

## EP-021 — Inline Add Rubro / Localidad

| # | Story | Agent | Status |
|---|---|---|---|
| 21.1 | Add "Agregar nuevo…" option at bottom of Rubro and Localidad pickers in client form | frontend | `pending` |
| 21.2 | On select: insert new value into `lookup_values` table + refresh lookupsStore | state | `pending` |
| 21.3 | Deduplicate on insert (case-insensitive) | backend | `pending` |

---

## EP-022 — Proper Agenda Navigation Stack

| # | Story | Agent | Status |
|---|---|---|---|
| 22.1 | Give Agenda its own nested Stack so visit detail opens within the Agenda stack | frontend | `pending` |
| 22.2 | Remove `from=agenda` query param workaround once stack context is correct | frontend | `pending` |

---

## EP-023 — QA Agent + E2E Tests

| # | Story | Agent | Status |
|---|---|---|---|
| 23.1 | Add Tester/QA agent definition to CLAUDE.md with scope over `/e2e/` | pm-tl | `pending` |
| 23.2 | Set up Playwright with Expo Web target | scripts | `pending` |
| 23.3 | E2E: login flow | scripts | `pending` |
| 23.4 | E2E: Excel import flow | scripts | `pending` |
| 23.5 | E2E: visit creation flow | scripts | `pending` |
| 23.6 | E2E: weekly email send | scripts | `pending` |

---

## EP-024 — Critical Bugs (Code Review Audit)

| # | Story | Agent | Status | Priority |
|---|---|---|---|---|
| 24.1 | Fix architecture violation: move `supabase.functions.invoke()` and auth/delete calls from settings.tsx to stores | state + frontend | `done` | 🔴 High |
| 24.2 | Fix weekly-email XSS: add `escapeHtml()` helper to prevent HTML injection in email body | backend | `done` | 🔴 High |
| 24.3 | Fix weekly-email: wrap per-user send in try/catch so one failure doesn't abort all users | backend | `done` | 🔴 High |
| 24.4 | Fix visits/[id].tsx: show error state on failed save/status update instead of false "Guardado ✓" | frontend | `done` | 🔴 High |
| 24.5 | Fix visits/form.tsx: check store error before calling `router.back()` on save | frontend | `done` | 🔴 High |
| 24.6 | Fix authStore: defer `loading: false` until `fetchProfile` resolves in `onAuthStateChange` listener | state | `done` | 🔴 High |
| 24.7 | Fix client detail screen stuck bug: add fetchClient() + loading state when navigating from visit | frontend + state | `done` | 🔴 High |

---

## EP-025 — Data/Logic Bugs & UX Violations (Code Review Audit)

| # | Story | Agent | Status | Priority |
|---|---|---|---|---|
| 25.1 | Fix weekly-email: format dates/times in `America/Argentina/Buenos_Aires`, not UTC | backend | `done` | 🟠 Medium |
| 25.2 | Fix import script: anchor `dayjs` timezone to Argentina when converting Excel dates | scripts | `done` | 🟠 Medium |
| 25.3 | Fix visitsStore pagination cursor: use compound `(scheduled_at, id)` instead of just `scheduled_at` | state | `done` | 🟠 Medium |
| 25.4 | Fix importStore NaN guard on gap + migrate to `/lib/dayjs.ts` | state | `done` | 🟠 Medium |
| 25.5 | Extract shared `StatusBadge` component to `/components/ui/` (consolidate 4 duplicates) | frontend | `done` | 🟠 Medium |
| 25.6 | Fix all touch targets below 48px: span/filter pills, chips, contact form inputs | frontend | `pending` | 🟠 Medium |
| 25.7 | Fix `+not-found.tsx`: apply theme tokens and translate copy to Spanish | frontend | `done` | 🟠 Medium |
| 25.8 | Add error/loading states to clients/index, visits/index, clients/[id], visits/[id], lookupsStore | frontend + state | `done` | 🟠 Medium |

---

## EP-026 — Performance & Code Quality (Code Review Audit)

| # | Story | Agent | Status | Priority |
|---|---|---|---|---|
| 26.1 | Optimize importStore: batch Supabase inserts in chunks of 50 instead of 986 sequential calls | state | `done` | 🟡 Low |
| 26.2 | Add DB filter for `enabled=true` in weekly-email instead of filtering in JS | backend | `done` | 🟡 Low |
| 26.3 | Add `CREATE INDEX lookup_values_type_idx` migration for picker queries | backend | `done` | 🟡 Low |
| 26.4 | Add lookupsStore stale-refresh on app focus | state | `done` | 🟡 Low |
| 26.5 | Extend client search to `contacts[*].name` and `contacts[*].phone`, not just name/city/industry | state | `done` | 🟡 Low |
| 26.6 | Exclude canceled visits from weekly email query | backend | `done` | 🟡 Low |
| 26.7 | Use `Constants.expoConfig?.version` instead of hardcoded `'1.0.0'` in settings | frontend | `done` | 🟡 Low |
| 26.8 | Fix `0005_seed_dev.sql`: update to use `contacts` JSONB format and add `ON CONFLICT DO NOTHING` | backend | `done` | 🟡 Low |
| 26.9 | Wire `updateStatusSchema` validation in `visitsStore.updateStatus()` | state | `done` | 🟡 Low |
| 26.10 | Add `sender` email validation in Settings screen before save | frontend | `done` | 🟡 Low |

---

## Pending

> All stories across all EPs that are not yet `done`.

| EP | # | Story | Agent |
|---|---|---|---|
| EP-007 | 7.7 | Run import against dev Supabase and verify data | pm-tl |
| EP-010 | 10.4 | Extract email name from auth email → populate sender_address/sender_name in email_config (multi-user ready) | backend + frontend + state |
| EP-014 | 14.7 | Run migration 0010 and re-import with clean data | pm-tl |
| EP-016 | 16.1 | "Last visited" badge on client card (color-coded) | frontend |
| EP-016 | 16.2 | "Sin visita en X días" filter in client filter modal | frontend |
| EP-017 | 17.1 | WhatsApp pre-filled greeting (`?text=Hola [name]!`, +549 prefix) | frontend |
| EP-017 | 17.2 | Structured minuta template pre-fill on empty visit notes | frontend |
| EP-017 | 17.3 | "Visitar hoy" one-tap button on client detail | frontend + state |
| EP-018 | 18.1 | Visit stats: this week/month count + completion rate | state |
| EP-018 | 18.2 | Top clients by visit frequency | state |
| EP-018 | 18.3 | Statistics UI on Today screen | frontend |
| EP-019 | 19.1–19.3 | Onboarding tour v2 | frontend |
| EP-020 | 20.1–20.5 | Agenda by distance | frontend + backend + state |
| EP-021 | 21.1–21.3 | Inline add Rubro / Localidad | frontend + state + backend |
| EP-022 | 22.1–22.2 | Proper Agenda navigation stack | frontend |
| EP-023 | 23.1–23.6 | QA agent + Playwright E2E tests | pm-tl + scripts |

---

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-03-04 | Single visit entity (no separate appointment model) | Simplicity; a visit starts scheduled and gets notes added |
| 2026-03-04 | Online-first + read-only offline fallback for Today | Avoids complex sync queue in MVP |
| 2026-03-04 | Resend for weekly email transport | Simple API, reliable, easy to configure |
| 2026-03-04 | Flat Expo project (no monorepo) | MVP scope; web expansion via platform targeting later |
| 2026-03-04 | All DB tables/columns in English | Consistency and tooling compatibility |
| 2026-03-04 | Deduplicate Excel clients by name+address (lowercased) | Matches how field data is entered |
| 2026-03-04 | White-label design system with token-based theming | App should be sellable to different salespeople/agencies without code changes |
| 2026-03-04 | High
-contrast UI optimized for outdoor/sunlight readability | Primary user works in the field on a phone |
| 2026-03-04 | EP-000 Design System must complete before any frontend work | Prevents hardcoded values from spreading across components |
| 2026-03-06 | Tabs with nested Stacks must set `headerShown: false` on the Tab.Screen | Expo Router renders both the Tabs header AND the nested Stack header, creating duplicate titles |
| 2026-03-06 | Email `from` uses a verified technical domain (env var); user's email goes in `reply_to` | Better deliverability; replies still reach the user's inbox |
| 2026-03-06 | New Supabase projects use ES256 JWT signing; Edge Function gateway rejects it | Deploy Edge Functions with `--no-verify-jwt` and do auth at the app level |
| 2026-03-09 | `contacts JSONB` array of `{name,phone,email}` replaces flat columns | Supports multiple contacts per client; parser extracts names from messy Excel phone cells |
| 2026-03-09 | Excel date-only cells arrive as `Date` at `00:00:48` local (file creation artifact) | Check local `hour/minute` (not UTC hours) to detect date-only cells and default to 10:00 |
| 2026-03-09 | Import uses `dayLastTimeMap` keyed by date to stagger visits by gap | Aligns import behavior with the form's smart default time logic (EP-013.2) |
| 2026-03-09 | `visitsStore` paginates to 100; client detail used filtered store list | Added `fetchVisitsByClient` that fetches all visits for one client directly, bypassing pagination |
| 2026-03-09 | EAS cloud builds do not read local `.env` | Set `EXPO_PUBLIC_*` vars as EAS secrets via `eas secret:create` or expo.dev dashboard |
