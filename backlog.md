# Backlog — CRM Proar Pilar

> Status: `pending` | `in_progress` | `reviewing` | `done` | `blocked`
> Agents: `backend` | `frontend` | `state` | `scripts` | `ui-ux` | `pm-tl`

---

## EP-000 — Design System

> Must be completed before any frontend work starts.

| # | Story | Agent | Status |
|---|---|---|---|
| 0.1 | Define design tokens in `/constants/theme.ts` (colors, typography, spacing, radius) | ui-ux | `pending` |
| 0.2 | Create white-label config in `/constants/brand.ts` (appName, primaryColor, logoUrl) | ui-ux | `pending` |
| 0.3 | Document component specs: Button, Card, Input, Badge, StatusBadge, Banner | ui-ux | `pending` |
| 0.4 | Define navigation structure and tab bar visual spec | ui-ux | `pending` |

---

## EP-001 — Project Setup

| # | Story | Agent | Status |
|---|---|---|---|
| 1.1 | Initialize Expo project with TypeScript and Expo Router | pm-tl | `pending` |
| 1.2 | Set up Supabase project and store credentials in `.env` | backend | `pending` |
| 1.3 | Configure `supabase-js` client singleton in `/lib/supabase.ts` | state | `pending` |
| 1.4 | Configure `dayjs` with locale in `/lib/dayjs.ts` | state | `pending` |
| 1.5 | Set up folder structure as defined in CLAUDE.md | pm-tl | `pending` |
| 1.6 | Install and configure all dependencies (zustand, zod, dayjs, etc.) | pm-tl | `pending` |

---

## EP-002 — Database & RLS

| # | Story | Agent | Status |
|---|---|---|---|
| 2.1 | Create `profiles` table + RLS policies | backend | `pending` |
| 2.2 | Create `clients` table + RLS policies | backend | `pending` |
| 2.3 | Create `visits` table + RLS policies | backend | `pending` |
| 2.4 | Create `updated_at` trigger function (reusable) | backend | `pending` |
| 2.5 | Seed test user via Supabase Auth (dev only) | backend | `pending` |

---

## EP-003 — Auth

| # | Story | Agent | Status |
|---|---|---|---|
| 3.1 | Create `authStore` (session, user, login, logout) | state | `pending` |
| 3.2 | Build Login screen (`/(auth)/login.tsx`) | frontend | `pending` |
| 3.3 | Protect routes: redirect to login if no session | frontend | `pending` |
| 3.4 | Auto-restore session on app launch | state | `pending` |
| 3.5 | Create/upsert profile row on first login | state | `pending` |

---

## EP-004 — Clients

| # | Story | Agent | Status |
|---|---|---|---|
| 4.1 | Create `clientsStore` (list, create, update, delete) | state | `pending` |
| 4.2 | Create `useClients` hook | state | `pending` |
| 4.3 | Build Clients list screen with search | frontend | `pending` |
| 4.4 | Build Client detail screen | frontend | `pending` |
| 4.5 | Build Create/Edit client form with Zod validation | frontend | `pending` |
| 4.6 | "Open in Google Maps" button (address + city) | frontend | `pending` |

---

## EP-005 — Visits

| # | Story | Agent | Status |
|---|---|---|---|
| 5.1 | Create `visitsStore` (list by client, create, update) | state | `pending` |
| 5.2 | Create `useVisits` hook | state | `pending` |
| 5.3 | Build Visit detail / notes screen | frontend | `pending` |
| 5.4 | Build Create/Edit visit form with Zod validation | frontend | `pending` |
| 5.5 | Status update flow (pending → completed / canceled) | frontend | `pending` |
| 5.6 | Show visit history on Client detail screen | frontend | `pending` |

---

## EP-006 — Today Dashboard

| # | Story | Agent | Status |
|---|---|---|---|
| 6.1 | Create `todayStore` with today's visits + clients | state | `pending` |
| 6.2 | Offline cache: persist today's data to AsyncStorage | state | `pending` |
| 6.3 | Auto-refresh every 60 seconds while screen is active | state | `pending` |
| 6.4 | Build Today screen: list of today's appointments | frontend | `pending` |
| 6.5 | "Next appointment" banner with countdown | frontend | `pending` |
| 6.6 | "Overdue by X minutes" state when past scheduled time | frontend | `pending` |
| 6.7 | Offline banner when showing cached data | frontend | `pending` |

---

## EP-007 — Data Import

| # | Story | Agent | Status |
|---|---|---|---|
| 7.1 | Write `import-excel.ts` script with column mapping | scripts | `pending` |
| 7.2 | Client deduplication logic (name + address) | scripts | `pending` |
| 7.3 | Visit creation logic (rows with Fecha) | scripts | `pending` |
| 7.4 | Default time 10:00 for rows without time in Fecha | scripts | `pending` |
| 7.5 | Dry-run mode: log what would be inserted without writing | scripts | `pending` |
| 7.6 | Run import against dev Supabase and verify data | pm-tl | `pending` |

---

## EP-008 — Weekly Email Summary

| # | Story | Agent | Status |
|---|---|---|---|
| 8.1 | Store email config in `profiles.email_config` (sender, recipients, enabled) | backend | `pending` |
| 8.2 | Build Supabase Edge Function: query last week's visits | backend | `pending` |
| 8.3 | Generate HTML email with client name, date, notes | backend | `pending` |
| 8.4 | Send via Resend API | backend | `pending` |
| 8.5 | Schedule function with pg_cron (every Monday 08:00) | backend | `pending` |
| 8.6 | Settings screen: configure sender + recipients | frontend | `pending` |

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
