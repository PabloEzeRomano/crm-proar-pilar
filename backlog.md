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
| 7.7 | Run import against dev Supabase and verify data | pm-tl | `pending` |

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
| 10.4 | Verify sending domain in Resend dashboard and set secrets | pm-tl | `pending` |

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

## Future (Post-MVP)

| Idea | Notes |
|---|---|
| Better onboarding tour | Point at actual UI elements, guide user to import Excel/CSV |
| Auto-organize agenda by distance | Requires device location permission + route optimization |
| Add new Rubro / Localidad from client form | Inline "add new" option in the lookup picker; writes to `lookup_values` table |
| Proper Agenda navigation context | Navigate within the Agenda's own stack so back arrow always returns correctly without query params |
| Tester / QA Agent + Playwright | Add a dedicated QA agent with scope over `/e2e/` tests; implement Playwright for end-to-end testing of critical flows (login, import, visit creation, email send) |

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
| 2026-03-04 | High-contrast UI optimized for outdoor/sunlight readability | Primary user works in the field on a phone |
| 2026-03-04 | EP-000 Design System must complete before any frontend work | Prevents hardcoded values from spreading across components |
| 2026-03-06 | Tabs with nested Stacks must set `headerShown: false` on the Tab.Screen | Expo Router renders both the Tabs header AND the nested Stack header, creating duplicate titles |
| 2026-03-06 | Email `from` uses a verified technical domain (env var); user's email goes in `reply_to` | Better deliverability; replies still reach the user's inbox |
| 2026-03-06 | New Supabase projects use ES256 JWT signing; Edge Function gateway rejects it | Deploy Edge Functions with `--no-verify-jwt` and do auth at the app level |
