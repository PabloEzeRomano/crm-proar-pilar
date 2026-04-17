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
| 16.1 | Show "last visited X days ago" badge on client card (color-coded: green <30d, amber 30-60d, red >60d) | frontend | `done` |
| 16.2 | Add "Sin visita en 30/60/90 días" filter option to client filter modal | frontend | `done` |
| 16.3 | Add `fetchVisitsByClient` bypass for pagination so all client visits are loaded in detail screen | state | `done` |

---

## EP-017 — UX Quick Wins

| # | Story | Agent | Status |
|---|---|---|---|
| 17.1 | WhatsApp pre-filled greeting: add `?text=Hola [name]!` to `wa.me` URL; handle Argentina +549 prefix | frontend | `done` |
| 17.2 | Structured minuta template: pre-fill empty notes with "Objetivo / Resultado / Próximos pasos" | frontend | `done` |
| 17.3 | "Visitar hoy" one-tap button on client detail: creates visit at smart default time, skips if already exists | frontend + state | `done` |
| 17.4 | Dev-only "Borrar clientes y visitas" button in Settings (guarded by `__DEV__`) | frontend | `done` |

---

## EP-018 — Visit Statistics

| # | Story | Agent | Status |
|---|---|---|---|
| 18.1 | Visits this week / month count, completion rate — computed from `visitsStore` | state | `done` |
| 18.2 | Top clients by visit frequency | state | `done` |
| 18.3 | Statistics UI — bottom-sheet modal opened from chart icon in Today screen header | frontend | `done` |

---

## EP-019 — Onboarding Tour v2

| # | Story | Agent | Status |
|---|---|---|---|
| 19.1 | Point tour steps at actual UI elements (tooltips/highlights, not just modals) | frontend | `done` |
| 19.2 | Add import Excel/CSV step to tour flow | frontend | `done` |
| 19.3 | Add contact-tap demo step (show Llamar / WhatsApp) | frontend | `pending` |

---

## EP-020 — Agenda by Distance

| # | Story | Agent | Status |
|---|---|---|---|
| 20.1 | Request device location permission | frontend | `done` |
| 20.2 | Add `latitude` / `longitude` columns to `clients` (nullable) | backend | `done` |
| 20.3 | Geocode client address + city on save (Nominatim / OpenStreetMap API) | state | `done` |
| 20.4 | Sort today's agenda by distance from current location | frontend | `done` |
| 20.5 | One-time backfill script to geocode all existing clients | scripts | `done` |

---

## EP-021 — Inline Add Rubro / Localidad

| # | Story | Agent | Status |
|---|---|---|---|
| 21.1 | Add "Agregar nuevo…" option at bottom of Rubro and Localidad pickers in client form | frontend | `done` |
| 21.2 | On select: insert new value into `lookup_values` table + refresh lookupsStore | state | `done` |
| 21.3 | Deduplicate on insert (case-insensitive) | backend | `done` |

---

## EP-022 — Proper Agenda Navigation Stack

| # | Story | Agent | Status |
|---|---|---|---|
| 22.1 | Give Agenda its own nested Stack so visit detail opens within the Agenda stack | frontend | `done` |
| 22.2 | Remove `from=agenda` query param workaround once stack context is correct | frontend | `done` |

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
| 25.6 | Fix all touch targets below 48px: span/filter pills, chips, contact form inputs | frontend | `done` | 🟠 Medium |
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

## EP-027 — Roles & Permissions (USER / ADMIN / ROOT)

| # | Story | Agent | Status |
|---|---|---|---|
| 27.1 | Migration `0015_add_profile_role.sql`: add `role` column, protect from self-elevation (trigger blocks user changing own role), `auth.is_admin()` SECURITY DEFINER helper | backend | `done` |
| 27.2 | Migration `0016_admin_rls.sql`: drop + recreate SELECT/UPDATE/DELETE policies on `clients` and `visits` to add `OR auth.is_admin()` bypass | backend | `done` |
| 27.3 | Add `UserRole = 'user' \| 'admin' \| 'root'` type + `role: UserRole` to `Profile` interface | state | `done` |
| 27.4 | Admin clients view: when `profile.role === 'admin'`, clients list shows all users' clients with owner indicator (full_name or email label) | frontend | `done` |
| 27.5 | Admin visits view: same pattern — visits list and today screen show all users' visits when admin | frontend | `done` |
| 27.6 | Docs only: role promotion happens via Supabase dashboard SQL (`UPDATE profiles SET role = 'admin' WHERE id = '...'`) — no in-app UI needed for MVP | pm-tl | `done` |

**Note on Role Promotion (27.6):**
- Role promotion (user → admin) is **NOT** exposed in the app UI for MVP.
- Only service-role authenticated requests can bypass the self-elevation guard (`auth.is_admin()` check on the trigger).
- To promote a user to admin:
  1. Go to [Supabase dashboard](https://supabase.com/dashboard)
  2. Navigate to the project's **SQL Editor**
  3. Run the query: `UPDATE profiles SET role = 'admin' WHERE id = '<user_id>';`
  4. Find the user's ID in **Auth** → **Users** table (copy the UUID from the `id` column)
- Demoting back to user: `UPDATE profiles SET role = 'user' WHERE id = '<user_id>';`
- This is by design: only service-role (backend automation or dashboard admin) can change roles, preventing accidental or malicious self-elevation.

---

## EP-028 — Web Version (MVP Complete)

> **Status:** `done` — Web support via React Native Web within same Expo project. Stores, types, validators, theme tokens all reused (100% code sharing). No separate Next.js app needed.
>
> **Rationale:** RNW proved no build complexity — no metro.config.js or custom stubs exist. Previous defer decision was based on outdated state. Web infrastructure already in place (react-native-web@0.21, yarn web script). Only blocking issue was DateTimePicker, now fixed with HTML `<input>` on web. Stories 28.3–28.5 were already done from prior work.

| # | Story | Agent | Status |
|---|---|---|---|
| 28.1 | Verify `yarn web` boots + document any runtime errors | pm-tl | `done` |
| 28.2 | Fix DateTimePicker on web: wrap in `Platform.select` — native uses existing pickers, web uses `<input type="date">` + `<input type="time">` via `TextInput` styled inputs | frontend | `done` |
| 28.3 | Responsive shell: on wide screens (`width > 768`), wrap tab content in a `maxWidth: 480` centered container so it doesn't stretch; no full redesign | ui-ux + frontend | `done` |
| 28.4 | Admin web dashboard tab: when `profile.role === 'admin'` on web, add an "Equipo" tab showing visits/clients across all users (reuses EP-027 data layer) | frontend | `done` |
| 28.5 | Guard `expo-location` `sortByDistance` on web: already partially working (Geolocation API), verify or add `Platform.OS !== 'web'` guard | frontend | `done` |

---

## EP-029 — Push Notifications (Local Scheduled)

| # | Story | Agent | Status |
|---|---|---|---|
| 29.1 | Install `expo-notifications`, add plugin to `app.json` (iOS + Android 13 permissions, `POST_NOTIFICATIONS`) | pm-tl | `done` |
| 29.2 | Permission request after auth + notification response listener (tap → navigate to visit) in root layout | frontend | `done` |
| 29.3 | `lib/notifications.ts`: `scheduleVisitReminder(visit, clientName, gapMinutes): Promise<string \| null>` — computes fire time, calls `scheduleNotificationAsync`, returns notificationId. `cancelVisitReminder(notificationId)`. Guards `Platform.OS !== 'web'`. | state | `done` |
| 29.4 | Add `notification_id?: string` column to `visits` table (migration `0017`) so we can cancel/reschedule across app restarts | backend | `done` |
| 29.5 | Add `notification_id` to `Visit` type + wire `scheduleVisitReminder` into `visitsStore.createVisit` + `updateVisit` (future visits only); `cancelVisitReminder` in `updateStatus('canceled')` + `deleteVisit` | state | `done` |
| 29.6 | Notification content: title `"Visita con {clientName}"`, body `"Quedan ~10 min. ¿Agendás la próxima visita?"` — tap opens `/visits/form?clientId=X` | state | `done` |
| 29.7 | Settings toggle: allow user to disable visit reminders (stored in AsyncStorage `notifications-enabled`); check in `scheduleVisitReminder` before scheduling | frontend | `done` |

---

## EP-030 — User Registration + Password Recovery

| # | Story | Agent | Status |
|---|---|---|---|
| 30.1 | Create Zod validator for signup: `email`, `password`, `passwordConfirm`, `fullName` — password strength rules, email format, match confirm | state | `done` |
| 30.2 | Build Registration screen (`/(auth)/register.tsx`) with email, full name, password, confirm password inputs + sign-up button | frontend | `done` |
| 30.3 | Add `signUp(email, password, fullName)` action to `authStore` — calls `supabase.auth.signUp()` with email/password + full_name metadata | state | `done` |
| 30.4 | Provide branded HTML for Supabase email templates: "Confirm signup" + "Reset password" — use theme colors, clear CTA | backend | `done` |
| 30.5 | Configure Supabase dashboard: auth redirect URL, email templates. Supabase sends verification emails natively | backend | `done` |
| 30.6 | Handle email verification deep link: `crm-proar://auth/callback?code=...` → `exchangeCodeForSession()` → auto-login | frontend + state | `done` |
| 30.7 | Error handling: duplicate email, password mismatch, validation failures → show user-friendly messages | frontend | `done` |
| 30.8 | Link Login screen to Registration: add "Crear cuenta" button/link below login form | frontend | `done` |
| 30.9 | Build Forgot Password screen (`/(auth)/forgot-password.tsx`): email input + "Enviar link" button | frontend | `done` |
| 30.10 | Add `requestPasswordReset(email)` action to `authStore` — calls `supabase.auth.resetPasswordForEmail()` | state | `done` |
| 30.11 | Build Reset Password screen (`/(auth)/reset-password.tsx`): new password + confirm + save button | frontend | `done` |
| 30.12 | Add `updatePassword(newPassword)` action to `authStore` — updates user password + signs out | state | `done` |
| 30.13 | Add `isPasswordRecovery` state + `PASSWORD_RECOVERY` event handler in `authStore` | state | `done` |
| 30.14 | Update root layout: add `useDeepLinkHandler()` + `useAuthGuard()` check for `isPasswordRecovery` | frontend + state | `done` |
| 30.15 | Link forgot password in login screen ("Olvidaste tu contraseña?") | frontend | `done` |

> **Summary:** Registration + email verification + password recovery complete. Uses Supabase's built-in email system (no custom Edge Function). Branded HTML templates pasted into Supabase dashboard.

---

## EP-031 — Gestiones / Management Actions

| # | Story | Agent | Status |
|---|---|---|---|
| 31.1 | Migration `0019_add_visit_type.sql`: `type TEXT NOT NULL DEFAULT 'visit'` + CHECK constraint | backend | `done` |
| 31.2 | `VisitType` type + `type` on `Visit` interface + `visitTypeSchema` in validators + store carries `type` | state | `done` |
| 31.3 | Type selector pills in visit form (before date field); default `'visit'`; labels in Spanish | frontend | `done` |
| 31.4 | Type badge in visit list row + Estado/Tipo side-by-side in detail screen | frontend | `done` |

---

## EP-032 — Address Autocomplete (Nominatim)

| # | Story | Agent | Status |
|---|---|---|---|
| 32.1 | Verify "Abrir en Maps" on client detail — confirmed working (address + city → Google Maps) | frontend | `done` |
| 32.2 | Magnifier button next to Domicilio field opens search modal; Nominatim query with 500ms debounce; select populates address, city, lat/lon | frontend + state | `done` |

---

## EP-033 — Client List Filters and Sorting

| # | Story | Agent | Status |
|---|---|---|---|
| 33.1 | Sort button in client list header; 5 sort options (name A–Z/Z–A, last visited recent/oldest, stale-first); persisted in AsyncStorage `clients-sort-order` | frontend + state | `done` |
| 33.2 | Filter by visit type in filter modal; dismissible chip in active filters bar | frontend + state | `done` |

---

## EP-034 — UI: Smaller Filter Pills

| # | Story | Agent | Status |
|---|---|---|---|
| 34.1 | Reduce `paddingVertical` on filter pills to `spacing[1]` (4px); add `hitSlop` to maintain 48px touch target; removed fixed `height: 48` from visit filter pills + client active chips | frontend + ui-ux | `done` |

---

## EP-035 — Bug: visit notes missing after Excel import

| # | Story | Agent | Status |
|---|---|---|---|
| 35.1 | Fix notes column typo in importStore: `'Minuta de la Reunião'` → `'Minuta de la Reunión'` | scripts + state | `done` |

---

## EP-036 — Bug: past visits auto-completing

| # | Story | Agent | Status |
|---|---|---|---|
| 36.1 | Remove auto-status-from-date logic in visit form; new visits always default to `pending` | state + frontend | `done` |

---

## EP-037 — Send report email on demand with custom recipients

| # | Story | Agent | Status |
|---|---|---|---|
| 37.1 | Remove `__DEV__` guard from "Enviar reporte ahora" button in Settings | frontend | `done` |
| 37.2 | "Send report" modal with pre-filled configured recipients (read-only chips) + ad-hoc recipient input; Zod-validated; ad-hoc not persisted | frontend + state | `done` |

> Note: Edge function (`weekly-email`) needs backend update to use `recipients` from request body when provided.

---

## EP-038 — Date range filter on visits list

| # | Story | Agent | Status |
|---|---|---|---|
| 38.1 | Calendar icon in visits list header opens date range modal; client-side filter; dismissible active range pill | frontend + state | `done` |

---

## EP-039 — Statistics: filter by completed status and date range

| # | Story | Agent | Status |
|---|---|---|---|
| 39.1 | "Solo completadas" toggle (default: on) + date range pickers (default: first of month → today) inside StatsModal; stats re-computed reactively | frontend + state | `done` |

---

## EP-040 — Keyboard covering inputs on Android

| # | Story | Agent | Status |
|---|---|---|---|
| 40.1 | Audit `app.json` softInputMode and existing KeyboardAvoidingView usage | frontend | `done` |
| 40.2 | Set `softInputMode: "adjustResize"` in `app.json` under `expo.android` | frontend | `done` |
| 40.3 | Verify modals (email report, address search) have keyboard avoidance | frontend | `done` |

---

## EP-041 — APK size reduction and build config fixes

| # | Story | Agent | Status |
|---|---|---|---|
| 41.1 | Fix softInputMode to `adjustPan` for KeyboardAwareScrollView compatibility | frontend | `done` |
| 41.2 | Enable Hermes JS engine + ProGuard + shrinkResources in app.json | frontend | `done` |
| 41.3 | Move `expo-dev-client` to devDependencies | pm-tl | `done` |
| 41.4 | Move `eas` CLI to devDependencies | pm-tl | `done` |
| 41.5 | Audit `xlsx` usage — found in `stores/importStore.ts` (app code, bundled) | pm-tl | `done` |
| 41.6 | Audit `react-native-svg` usage — zero imports found, unused dependency | pm-tl | `done` |
| 41.7 | Verify EAS production profile uses `app-bundle` (already correct) | pm-tl | `done` |

**41.5 finding:** `xlsx` is imported in `stores/importStore.ts` (in-app Excel import feature). This adds ~1.5MB to the bundle. Decision needed: keep the in-app import feature, or move it to scripts-only and remove the package from the mobile bundle.

**41.6 finding:** `react-native-svg` is listed in `dependencies` but has **zero imports** anywhere in the codebase. Safe to remove entirely — saves native module compilation time and some bundle size.

---

## EP-042 — Bug: visit type not saved on edit

| # | Story | Agent | Status |
|---|---|---|---|
| 42.1 | Fix `type` field not persisted on visit update — `visitType` was missing from `useLayoutEffect` deps in form.tsx, causing stale closure when only type changed | state + frontend | `done` |

---

## EP-043 — Delete visit (gestión)

| # | Story | Agent | Status |
|---|---|---|---|
| 43.1 | Add `deleting: boolean` and `deleteError: string | null` to visitsStore; update deleteVisit to use them | state | `done` |
| 43.2 | Delete button on visit detail screen with Alert confirmation; navigates back on success | frontend | `done` |

---

## EP-044 — Soft delete clients

| # | Story | Agent | Status |
|---|---|---|---|
| 44.1 | Migration `0021_soft_delete_clients.sql`: add `deleted_at TIMESTAMPTZ DEFAULT NULL` to clients | backend | `done` |
| 44.2 | Update Client type (`deleted_at?`); add `archiveClient`, `restoreClient`, `fetchInactiveClients` to clientsStore; `fetchClients` filters `deleted_at IS NULL` | state | `done` |
| 44.3 | Archive button on client detail with confirmation dialog | frontend | `done` |
| 44.4 | Archive icon toggle in client list header; shows inactive clients with muted style, Inactivo badge, and Restaurar button | frontend + state | `done` |

---

## EP-045 — Cross-platform date picker component

| # | Story | Agent | Status |
|---|---|---|---|
| 45.1 | `WebDatePicker.tsx`: calendar UI with RN primitives, Monday-first, minDate/maxDate, theme tokens | frontend + ui-ux | `done` |
| 45.2 | `AppDatePicker.tsx`: web date → WebDatePicker in modal; web time → HTML input; mobile → DateTimeInput pass-through | frontend | `done` |
| 45.3 | Replace DateTimeInput with AppDatePicker in form.tsx, StatsCard.tsx, visits/index.tsx | frontend | `done` |

---

## EP-046 — Searchable select/multiselect component

| # | Story | Agent | Status |
|---|---|---|---|
| 46.1 | `SearchableSelect.tsx`: pressable trigger, bottom-sheet modal with search, selected chips (multi), options list, single/multi mode, `onAddNew` callback | frontend + ui-ux | `done` |
| 46.2 | Replace Rubro and Localidad checkbox lists in client filter modal with `SearchableSelect multiple` | frontend | `done` |

---

## EP-047 — Searchable pickers for Rubro and Localidad in client form

| # | Story | Agent | Status |
|---|---|---|---|
| 47.1 | Replace Rubro and Localidad inline pickers in client form with `SearchableSelect multiple={false}`; "Agregar nuevo…" option preserved via `onAddNew` callback | frontend | `done` |

---

## EP-048 — User Invitation System with Seat Limit Control

| # | Story | Agent | Status |
|---|---|---|---|
| 48.1 | Migration `0022_user_role_enum.sql`: create `public.user_role` enum ('user', 'admin', 'root'), drop `check_role_valid` CHECK constraint, migrate `profiles.role` TEXT → enum, update `handle_new_user`, `fn_prevent_self_role_elevation`, and `auth.is_admin()` to use enum | backend | `done` |
| 48.2 | Migration `0023_companies.sql`: create `companies` and `company_config` tables with RLS (authenticated users see own company; admins see own company_config) | backend | `done` |
| 48.3 | Migration `0024_profiles_company.sql`: add `company_id` FK to `profiles`, update `handle_new_user` to read `role` + `company_id` from invite metadata, add `auth.my_company_id()` and `auth.is_root()` SECURITY DEFINER helpers, add `profiles_admin_select_policy` so admins can SELECT all profiles in their company | backend | `done` |
| 48.4 | Edge Function `invite-user`: validate caller is admin/root, check seat limit from `company_config.max_users` (root bypasses), call `supabase.auth.admin.inviteUserByEmail` with `role` + `company_id` metadata | backend | `done` |
| 48.5 | Add `CompanyConfig` type and `company_id` field to `Profile` in `types/index.ts` | state | `done` |
| 48.6 | Create `usersStore.ts`: `fetchUsers`, `fetchCompanyConfig`, `inviteUser` (calls `invite-user` Edge Function), loading/error/inviteLoading/inviteError state | state | `done` |
| 48.7 | Remove open registration: delete `app/(auth)/register.tsx`, remove "Crear cuenta" link from `login.tsx` | frontend | `done` |
| 48.8 | Create `app/(tabs)/users.tsx`: user list with role badges, seat counter (`X / MAX`), invite modal (email + role picker, Zod-validated), access guard for non-admin/root; register as hidden tab in `_layout.tsx` | frontend | `done` |
| 48.9 | Add "Gestión de usuarios" row in `settings.tsx` (admin/root only) navigating to `/(tabs)/users` | frontend | `done` |
| 48.10 | Document `invite-user` Edge Function, company bootstrap SQL, and `companies`/`company_config` setup instructions in `CLAUDE.md` | pm-tl | `done` |

---

## EP-048b — Invite Redirect URL + Password Setup Page

> **Context:** Supabase invite emails land users on the default confirmation page which logs them in with no password. EP-048b adds an intermediate static HTML page that lets users set a password, then redirects them to the app (native deep link or Expo web).

| # | Story | Agent | Status |
|---|---|---|---|
| 48b.1 | Create `web/auth/invite.html`: static password-setup page; verifies invite token via `verifyOtp`, shows password form, calls `updateUser({ password })`, then shows two buttons: "Abrir en la app" (native deep link `crm-proar://auth/callback#<tokens>`) and "Usar versión web" (`/auth/callback#<tokens>`) | backend + frontend | `done` |
| 48b.2 | Add `emailRedirectTo` to `invite-user` Edge Function using `INVITE_REDIRECT_URL` env secret (falls back to Supabase default if not set) | backend | `done` |
| 48b.3 | Add `isInviteSetup: boolean` + `setInviteSetup(value)` to `authStore`; block `useAuthGuard` redirect while flag is set | state | `done` |
| 48b.4 | Create `app/auth/callback.tsx`: reads `access_token` + `refresh_token` from `window.location.hash`, calls `supabase.auth.setSession()`, then clears `isInviteSetup` so guard can route to `/(tabs)/agenda`; native platform skips (handled by `useDeepLinkHandler`) | frontend | `done` |
| 48b.5 | Document hosting instructions, `WEB_APP_URL` constant, and `INVITE_REDIRECT_URL` secret in `CLAUDE.md` | pm-tl | `done` |

---

## EP-049 — Fixes: Nominatim, Role Trigger, Equipo Redesign, Email Config, Invite Password

| # | Story | Agent | Status |
|---|---|---|---|
| 49.3 | Fix Nominatim: add `countrycodes=ar` to address search modal + geocodeClient; remove manual `, Argentina` from query string | frontend + state | `done` |
| 49.4 | Fix address search input missing `borderRadius`; apply `borderRadius.md` from theme | frontend + ui-ux | `done` |
| 49.5 | Migration `0025_fix_role_trigger.sql`: fix `fn_prevent_self_role_elevation` to only block when `auth.uid() IS NOT NULL AND auth.uid() = NEW.id` so dashboard SQL Editor can promote users | backend | `done` |
| 49.6 | Redesign Equipo tab: replace flat team view with user list → per-user drill-down; visits/clients screens always show logged-in user's own data only; `fetchVisitsByOwner` + `fetchClientsByOwner` in stores | frontend + state | `done` |
| 49.7 | Fix weekly email: auto-populate `email_config` on first sign-in when null; update skip log message | state + backend | `done` |
| 49.8 | Add "Full name" field to set-invite-password screen; persist to auth metadata + profiles table | frontend + state | `done` |
| 49.9 | Docs: add "Bootstrap: First Root User" section to CLAUDE.md; update backlog | pm-tl | `done` |

---

## EP-050 — Quotes & Sales: amount, status labels, quote-to-sale linking, and admin views

| # | Story | Agent | Status |
|---|---|---|---|
| 50.1 | Migration `0026_visits_amount_quote_link.sql`: add `amount NUMERIC(12,2)` and `quote_id UUID FK self-ref` to visits | backend | `done` |
| 50.2 | Types + validators: add `amount`, `quote_id` to `Visit` interface and both visit Zod schemas | state | `done` |
| 50.3 | Shared helper `lib/visitStatus.ts` + `getStatusLabel`; fix `statusCanceled` → red in `theme.ts`; update `StatusBadge` to accept optional `type` prop; update all callers | frontend + ui-ux | `done` |
| 50.4 | Store: add `clientQuotes`, `fetchQuotesByClient`, `clearClientQuotes`, `getMonthlySalesTotal` to visitsStore | state | `done` |
| 50.5 | Visit form: amount field (quote/sale only) + quote suggestion picker (sale only); wire `amount`/`quote_id` into save | frontend | `done` |
| 50.6 | Visit detail: show amount row; link to originating quote (if sale); list generated sales (if quote); pass `type` to StatusBadge | frontend | `done` |
| 50.7 | Equipo admin views: Cotizaciones + Ventas tabs with summary cards; `allVisits` in store; read-only guard for other-user visits | frontend + state | `done` |
| 50.8 | Weekly email: add `type`/`amount` to Visit interface; quote/sale stat cells; amount next to status badge | backend | `done` |

---

## EP-051 — UI Audit & Visual Bug Fixes

| # | Story | Agent | Status |
|---|---|---|---|
| 51.1 | Fix StatusBadge misaligned when amount is present in team visit rows — alignItems flex-start + visitRowRight alignSelf center | frontend + ui-ux | `done` |
| 51.2 | Playwright visual audit script: login, navigate all main screens, screenshot each to `e2e/screenshots/`, basic assertions | frontend (QA) | `done` |
| 51.3 | Fix visual bugs: remove duplicate local StatusBadge in agenda/index.tsx; add cursor:pointer on web in VisitRow | frontend + ui-ux | `done` |
| 51.4 | Extract shared `VisitRow` component to `components/visits/VisitRow.tsx`; replace inline row rendering in Agenda, Visits, and Team screens | frontend + ui-ux | `done` |

---

## EP-052 — CORS Fix, Pending Invites, Deactivate User, Owner-Gated Buttons

| # | Story | Agent | Status |
|---|---|---|---|
| 52.1 | Fix CORS: add `...corsHeaders()` to `jsonResponse` in `invite-user`; redeploy | backend | `done` |
| 52.2a | Edge Function `list-users`: admin lists users with pending/active/banned status; fix root exclusion via metaRole + fix pending via confirmed_at | backend | `done` |
| 52.2b | Edge Function `deactivate-user`: ban user + soft-delete their clients | backend | `done` |
| 52.2c | Add `UserListItem` to `types/index.ts` | state | `done` |
| 52.2d | `usersStore`: swap `Profile[]` → `UserListItem[]`, add `deactivateUser` | state | `done` |
| 52.2e | `users.tsx`: pending badge, deactivate button, back button | frontend | `done` |
| 52.3 | `clients/[id].tsx`: hide archive/edit/visit buttons for non-owner clients | frontend | `done` |
| 52.4 | Team drill-down `[userId].tsx`: tabbed Visitas + Clientes with search + type filters | frontend | `done` |
| 52.5a | `weekly-email`: add `dateFrom`/`dateTo`/`userId` role validation; redeploy | backend | `done` |
| 52.5b | `authStore.invokeWeeklyEmail`: add `dateFrom`, `dateTo`, `targetUserId` params | state | `done` |
| 52.5c | `settings.tsx` send report modal: date range pickers + user selector (admin/root) | frontend | `done` |
| 52.6 | Stats modal: admin sees all-users aggregate by default + user selector pills to filter by individual user | frontend + state | `done` |

---

## EP-053 — VisitRow Grid Layout + Visit Type Colors

| # | Story | Agent | Status |
|---|---|---|---|
| 53.1 | `theme.ts`: add `visitTypeColors` token map (visit/call/quote/sale + light variants) | ui-ux | `done` |
| 53.2 | Replace `StatusBadge` with `StatusTypeBadge` (combined status + type rendering); delete `StatusBadge.tsx` | frontend + ui-ux | `done` |
| 53.3 | Refactor `VisitRow` into a 4-column grid: time / client+owner / notes (web only) / type chip + status | frontend + ui-ux | `done` |
| 53.4 | Add `showType` and `showNotes` optional props to `VisitRow` (both default false, backward compatible) | frontend | `done` |
| 53.5 | Notes column (col 3) not rendered on mobile — no space allocated, not just hidden | frontend | `done` |
| 53.6 | Layout tuning: card padding → `spacing[2]`, minHeight → 56, rightColumn `alignItems: flex-start`, col widths `flex 0.4/1.4` on web | ui-ux | `done` |

---

## EP-054 — Visits List: Search, Filter Modal, Owner Data

| # | Story | Agent | Status |
|---|---|---|---|
| 54.1 | `useVisits`: admin/root reads from `allVisits`; add `ownerFilter?: string[]` and `typeFilter?: VisitType[]` params; expose `isAdminOrRoot`; route `fetchVisits()` to `fetchAllVisitsForAdmin()` for admin/root | state | `done` |
| 54.2 | `fetchAllVisitsForAdmin`: after main fetch, query `profiles` for all unique `owner_user_id`s and merge `owner` data onto each visit (same pattern as `todayStore`) | state | `done` |
| 54.3 | `visits/index.tsx`: replace status pills + header calendar button with search bar + filter button (active count badge); filter modal with TIPO DE GESTIÓN / ESTADO / FECHA / VENDEDOR (admin/root) sections; draft/apply pattern; active filter chips below search bar; `showType` always on, `showOwner` for admin/root | frontend | `done` |

---

## EP-055 — Clients List: Admin All-Clients, Owner Profiles, Vendedor Filter

| # | Story | Agent | Status |
|---|---|---|---|
| 55.1 | `clientsStore`: add `allClients`, `allClientsLoading`, `ownerProfiles` state + `fetchAllClientsForAdmin()` action — fetches all company clients (no owner filter) then resolves `profiles(id, full_name)` for each unique owner | state | `done` |
| 55.2 | `useClients`: admin/root reads from `allClients`; add `ownerFilter?: string[]` param; route `fetchClients()` to `fetchAllClientsForAdmin()` for admin/root; remove direct Supabase call for ownerProfiles (now from store) | state | `done` |
| 55.3 | `clients/index.tsx`: add VENDEDOR multiselect section to filter modal (admin/root only, populated from `ownerProfiles`); draft/apply pattern; active chips + "Limpiar todo"; `activeFilterCount` includes vendedores | frontend | `done` |

---

## Pending

> All stories across all EPs that are not yet `done`.

| EP | # | Story | Agent |
|---|---|---|---|
| EP-019 | 19.3 | Contact-tap demo step (show Llamar / WhatsApp) | frontend |
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
| 2026-03-16 | Role promotion is admin-only and dashboard-only, not exposed in app UI | MVP requirement: prevents accidental/malicious elevation; only service-role (backend) can change roles; users self-elevate guard blocks app-level changes |
| 2026-03-16 | Notification content format: title `"Visita con {clientName}"`, body `"Quedan ~10 min. ¿Agendás la próxima visita?"` | Hardcoded in `/lib/notifications.ts` for simplicity; fires ~10 min before gap time ends so salesperson can schedule next visit while current one is active |
| 2026-03-16 | Android notification channels + foreground handler required for notifications to display | expo-notifications only shows notifications in foreground with `setNotificationHandler()` + channel setup; without these, notifications silently succeed but never appear to user |
| 2026-03-16 | Web version deferred to standalone Next.js app instead of React Native Web | RNW build complexity: conditional requires break Babel transpilation, metro.config stubs failed, async imports weren't processed at build time. Cleaner to separate concerns: mobile = Expo, web = Next.js, shared = API/Supabase |
| 2026-03-17 | Use Resend for signup verification emails instead of Supabase's built-in | Already integrated with Resend for weekly-email. Resend allows beautiful React Email templates + better deliverability + higher rate limits. Verification email is a first impression; worth the polish. |
| 2026-03-20 | Use Supabase's built-in email system for signup + password reset (EP-030 revision) | Simpler than custom Edge Function; Supabase manages token lifecycle; branded HTML templates customized in dashboard; Resend integration reserved for operational emails (weekly-email, bulk sends). |
| 2026-03-26 | Web version built within same Expo project via React Native Web (EP-028), not as separate Next.js app | Previous defer decision was based on outdated RNW state. Exploration revealed zero build complexity — no metro.config.js, no Babel stubs. Web infra already in place. Stores, types, validators, theme tokens 100% reused. Only fix: DateTimePicker → HTML `<input>` on web. Stories 28.3–28.5 already done from prior work. |
| 2026-04-09 | `profiles.role` uses a PostgreSQL enum `public.user_role` instead of a TEXT+CHECK constraint (EP-048) | Enums provide stricter DB-level type safety, enable exhaustive pattern matching in queries, and prevent invalid strings at the storage layer. Migration casts existing values cleanly via `USING role::public.user_role`. |
| 2026-04-09 | Open registration removed; users can only join via admin-sent invitations (EP-048) | Single-tenant CRM — user onboarding must be controlled by the company admin to prevent unauthorized access. `supabase.auth.admin.inviteUserByEmail` sends a Supabase-managed magic link; accepted invite triggers `handle_new_user` which sets `role` and `company_id` from metadata. |
| 2026-04-09 | Seat limit enforced server-side in `invite-user` Edge Function, not only in UI (EP-048) | UI checks can be bypassed; authoritative enforcement must be in backend. Root role bypasses limit by design for super-admin operations. `company_config.max_users` is managed directly in DB by root — no in-app UI for seat management at MVP. |
| 2026-04-09 | Invite flow uses static HTML intermediate page + separate Expo `/auth/callback` screen (EP-048b) | Supabase's default invite confirmation page logs users in with no password. Static HTML page (served outside the Expo app) exchanges `token_hash` for a session, prompts password setup, then redirects using URL fragment tokens. Native and web take different URL schemes but share the same session-transfer mechanism (`access_token` + `refresh_token` in fragment). `isInviteSetup` flag in authStore prevents auth guard from interfering while session is established. |
| 2026-04-13 | Quote/sale status uses existing VisitStatus values remapped via `getStatusLabel(status, type)` helper — no DB changes (EP-050) | `canceled` = red across all types for semantic consistency. Helper lives in `lib/visitStatus.ts`; `StatusBadge` gains optional `type` prop with `'visit'` fallback so all existing callers remain valid. |
| 2026-04-16 | Stats modal shows all-users aggregate for admin by default. `useVisitStats` userId param: `null`=all users (allVisits), `string`=specific user (filtered allVisits), `undefined`=own data (visits). Admin default is `null`; selecting a user pill passes their id; regular users receive `undefined` so behavior is unchanged. | EP-052 story 52.6. Keeps regular-user path identical — no regression risk. Admin sees team-wide stats on open without an extra tap. |
