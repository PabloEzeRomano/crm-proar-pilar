# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

Token Efficient Rules

1. Think before acting. Read existing files before writing code.
2. Be concise in output but thorough in reasoning.
3. Prefer editing over rewriting whole files.
4. Do not re-read files you have already read unless the file may have changed.
5. Test your code before declaring done.
6. No sycophantic openers or closing fluff.
7. Keep solutions simple and direct.
8. User instructions always override this file.

# CRM Proar Pilar — Claude Code Instructions

## Project Overview

A mobile-first CRM for a salesperson who visits businesses in person. Designed as a **daily agenda for sales visits**. MVP is mobile-only (Expo/React Native), but architecture must allow future web expansion.

**Primary user:** A salesperson managing client visits throughout the workday.
**Core need:** See today's schedule, navigate to clients, record visit notes.

---

## Tech Stack (locked — agents must not deviate)

| Layer           | Technology                       |
| --------------- | -------------------------------- |
| Framework       | Expo (SDK latest) + React Native |
| Language        | TypeScript (strict)              |
| Navigation      | Expo Router (file-based)         |
| State           | Zustand                          |
| Backend         | Supabase (Postgres)              |
| Client          | supabase-js                      |
| Validation      | Zod                              |
| Dates           | dayjs                            |
| Email           | Resend                           |
| Package Manager | yarn                             |

---

## Development

### Environment Setup

1. **Install dependencies:**

   ```bash
   yarn install
   ```

2. **Set up `.env` file** (copy from `.env.example`):

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=...  # From Supabase project settings
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...  # From Supabase project settings
   SUPABASE_SERVICE_ROLE_KEY=...  # From Supabase project settings (for scripts)
   ```

3. **For weekly email Edge Function:** Set `RESEND_API_KEY` and `MAIL_FROM_ADDRESS` in Supabase → Edge Functions → weekly-email → Secrets (not in `.env`).

4. **For invite-user Edge Function:** Uses `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` (auto-injected). Helper functions `public.my_company_id()` and `public.is_root()` live in the `public` schema (not `auth.*`) due to CLI schema permission limits. Deploy with:
   ```bash
   supabase functions deploy invite-user --no-verify-jwt
   ```
   (JWT verification is done manually inside the function using the anon key.)

### Running the App Locally

```bash
# Start Expo dev server
yarn start

# In the Expo Go app or dev client:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Press 'w' for web (experimental)
```

For faster iteration with a development client:

```bash
# Install/run development client
yarn start-dev
```

### Building and Deployment

```bash
# Build for Android (preview APK for testing)
yarn APK  # → EAS preview build

# Build for iOS (requires EAS credentials)
eas build -p ios --profile development

# Build for production
eas build -p android --profile production
eas build -p ios --profile production
```

### Database Migrations

```bash
# Create a new migration file
# File should be numbered sequentially (e.g., 0012_your_feature.sql)
# Store in /supabase/migrations/

# Apply migrations:
# Option 1: Push to dev via Supabase CLI
supabase db push

# Option 2: For prod, use Supabase dashboard SQL editor
# Copy the migration content and run it directly
```

## Bootstrap: First Root User

The first system administrator must be promoted to `root` manually from the Supabase dashboard. This is a one-time operation per project.

**Steps:**

1. Create your account normally in the app (email + password login, or accept an invite if another admin exists)
2. Find your User ID in **Supabase dashboard → Authentication → Users**
3. Open **SQL Editor** and run:

```sql
UPDATE public.profiles
SET role = 'root'
WHERE id = '<your-user-id>';
```

4. Verify: `SELECT id, full_name, role FROM public.profiles WHERE id = '<your-user-id>';`
5. Sign out and sign back in so the app reloads the profile

**Why this works:** The SQL Editor runs as `postgres`, not as an authenticated user, so `auth.uid()` is NULL and the `fn_prevent_self_role_elevation` trigger does not block the change (see migration 0025). Once you are `root`, you can invite admins directly from **User Management** inside the app.

---

### Initial Company Setup (after migrations 0022–0024)

After applying migrations, root must bootstrap company data directly in the Supabase dashboard SQL Editor:

```sql
-- 1. Create the company
INSERT INTO public.companies (name) VALUES ('Proar Pilar')
RETURNING id;  -- copy this UUID

-- 2. Create company config (adjust max_users as needed)
INSERT INTO public.company_config (company_id, max_users)
VALUES ('<company_uuid>', 5);

-- 3. Assign existing users to the company
UPDATE public.profiles SET company_id = '<company_uuid>';
```

To increase the seat limit later:

```sql
UPDATE public.company_config SET max_users = 10 WHERE company_id = '<company_uuid>';
```

### Excel Import Script

```bash
# Dry run (preview what will be imported)
yarn import:dry

# Actual import (creates clients + visits)
yarn import

# The script:
# - Deduplicates clients by (name + address)
# - Creates visits with status 'completed' for rows with dates
# - Defaults to 10:00 AM if no time provided
# - Is idempotent (safe to run multiple times)
```

### Common Development Tasks

**Add a new screen:**

1. Create file in `/app/(tabs)/` or `/app/(auth)/` following Expo Router conventions
2. Add route guard if needed (check `authStore.user`)
3. Use Zustand stores for data (never call Supabase directly)

**Add a new Zustand store:**

1. Create file in `/stores/` (e.g., `featureStore.ts`)
2. Define types in `/types/index.ts`
3. Handle loading, error, and data state
4. Expose only what components need

**Add a new database table:**

1. Create migration in `/supabase/migrations/` with next sequence number
2. Include `owner_user_id UUID NOT NULL` and RLS policies
3. Push migration via Supabase CLI
4. Create store to handle Supabase calls

**Update a Zod validator:**

1. Edit the schema in `/validators/` (e.g., `visit.ts`)
2. Use it in forms via `validator.parse()` or `.safeParse()`
3. Keep validators close to where they're used

---

## Architecture Principles (non-negotiable)

1. **Multi-user ready from day 1.** Every table has `owner_user_id UUID NOT NULL` referencing `auth.users`. RLS enforces `owner_user_id = auth.uid()` on every table.
2. **All database tables and columns in English.** No Spanish column names.
3. **Single visit entity.** A visit starts as a scheduled appointment and gets updated with notes + status. No separate appointment/visit tables.
4. **Flat project structure.** No monorepo for MVP. Everything lives in one Expo project.
5. **Web expansion via platform targeting.** Future web support via Expo's platform selection — no architectural changes needed.
6. **Online-first with read-only offline fallback.** Cache today's data (appointments + clients) in Zustand + AsyncStorage. Show a banner if stale. No offline write queue for MVP.
7. **No premature abstractions.** Build for current requirements only. Three similar lines > one forced abstraction.
8. **White-label ready.** No brand colors, names, or assets hardcoded in components. All visual values reference tokens from `/constants/theme.ts` and brand config from `/constants/brand.ts`.

---

## Data Model

### `profiles`

Extends `auth.users`. One row per user.

| Column       | Type        | Notes                               |
| ------------ | ----------- | ----------------------------------- |
| id           | UUID PK     | References auth.users               |
| full_name    | TEXT        |                                     |
| email_config | JSONB       | `{ sender, recipients[], enabled }` |
| created_at   | TIMESTAMPTZ |                                     |
| updated_at   | TIMESTAMPTZ |                                     |

### `clients`

Businesses the salesperson visits.

| Column        | Type          | Notes                                                                          |
| ------------- | ------------- | ------------------------------------------------------------------------------ |
| id            | UUID PK       |                                                                                |
| owner_user_id | UUID NOT NULL | References auth.users, RLS                                                     |
| name          | TEXT NOT NULL | Cliente                                                                        |
| industry      | TEXT          | RUBRO                                                                          |
| address       | TEXT          | Domicilio                                                                      |
| city          | TEXT          | Localidad                                                                      |
| contacts      | JSONB         | `ContactInfo[]` — `[{ name?, phone?, email? }]` — multiple contacts per client |
| notes         | TEXT          | General notes                                                                  |
| created_at    | TIMESTAMPTZ   |                                                                                |
| updated_at    | TIMESTAMPTZ   |                                                                                |

> `contact_name`, `phone`, `email` columns were dropped in migration 0010 and replaced by `contacts JSONB`.

### `visits`

Single entity: starts as scheduled appointment, updated with notes after.

| Column        | Type                 | Notes                               |
| ------------- | -------------------- | ----------------------------------- |
| id            | UUID PK              |                                     |
| owner_user_id | UUID NOT NULL        | References auth.users, RLS          |
| client_id     | UUID NOT NULL        | References clients                  |
| scheduled_at  | TIMESTAMPTZ NOT NULL | Default time 10:00 if no time known |
| status        | TEXT NOT NULL        | `pending`, `completed`, `canceled`  |
| notes         | TEXT                 | Minuta de la Reunión                |
| created_at    | TIMESTAMPTZ          |                                     |
| updated_at    | TIMESTAMPTZ          |                                     |

---

## File Structure

```
/app
  /(auth)
    login.tsx
  /(tabs)
    index.tsx                  # Today dashboard
    clients/
      index.tsx                # Clients list
      [id].tsx                 # Client detail
    visits/
      index.tsx                # Visits list
      [id].tsx                 # Visit detail + notes form
    _layout.tsx
  _layout.tsx
/components
  /ui                          # Generic: Button, Card, Input, Badge, etc.
  /clients                     # ClientCard, ClientList
  /visits                      # VisitCard, VisitForm
  /today                       # NextAppointmentBanner, TodayList
/stores
  authStore.ts
  clientsStore.ts
  visitsStore.ts
  todayStore.ts                # Includes offline cache logic
/lib
  supabase.ts                  # Supabase client (singleton)
  dayjs.ts                     # dayjs config + locale
/hooks
  useClients.ts
  useVisits.ts
  useToday.ts
/validators
  client.ts
  visit.ts
/types
  index.ts                     # All shared TypeScript types
/constants
  theme.ts                     # Design tokens (colors, typography, spacing, radius)
  brand.ts                     # White-label config (appName, primaryColor, logoUrl)
  index.ts
/supabase
  /migrations                  # SQL migration files
  /functions
    /weekly-email              # Edge Function: runs every Monday
      index.ts
    /invite-user               # Edge Function: admin-controlled user invitation
      index.ts
/scripts
  import-excel.ts              # One-time Excel import script
```

### Invite Flow (EP-48b)

```
Supabase invite email
  → http://[Site URL]#access_token=...&refresh_token=...&type=invite
          ↓
  _layout.tsx useDeepLinkHandler (web: handleWebFragment, native: handleUrl)
      • setSession(access_token, refresh_token)
      • type=invite → isInviteUser=true
          ↓
  useAuthGuard → /(auth)/set-invite-password
      • user sets password → setInitialPassword()
      • isInviteUser=false → router.replace('/(tabs)/agenda')
```

---

## Agent System

### How it works

This project uses a **multi-agent team** managed by a PM+TL orchestrator. When starting a session, Claude acts as **PM+TL** by default. Tasks are tracked in `backlog.md`.

### PM+TL Agent (Orchestrator)

**Role:** Project Manager + Tech Lead.

**Responsibilities:**

- Read `backlog.md` at the start of every session. Know what is `pending`, `in_progress`, `reviewing`, `done`.
- Break features into user stories and add them to `backlog.md`.
- Assign tasks to specialized agents by spawning them with scoped, clear prompts.
- Review all output from agents before marking tasks `done`.
- Enforce architecture principles. Reject code that violates them.
- Update `backlog.md` after every completed task.
- Never write application code directly — delegate to specialized agents.

**Status workflow:**
`pending` → `in_progress` → `reviewing` → `done` (or `blocked` if a dependency is missing)

### Backend Agent

**Scope:** Supabase only. Schema, migrations, RLS policies, Edge Functions.

**Rules:**

- All migrations in `/supabase/migrations/` as numbered SQL files.
- Every table must have `owner_user_id` + RLS.
- Use `gen_random_uuid()` for PKs.
- All column and table names in English.
- Edge Functions in TypeScript, placed in `/supabase/functions/`.
- Never touch `/app`, `/components`, `/stores`, or `/hooks`.

### Frontend Agent

**Scope:** Expo Router screens and React Native components.

**Rules:**

- Screens in `/app/`, components in `/components/`.
- Use Expo Router conventions (file-based routing, `<Link>`, `useRouter`).
- **Tabs with nested Stacks:** If a tab points to a folder with its own `_layout.tsx` (Stack), the `Tabs.Screen` for that tab MUST set `headerShown: false`. Otherwise Expo Router renders both the Tabs header AND the Stack header, creating a duplicate title. The nested Stack owns the header for all its screens.
- Mobile-first. No web-specific code for MVP.
- Use `dayjs` for all date formatting. Never use `new Date().toLocaleString()`.
- Read data from Zustand stores — do not call Supabase directly from components.
- Use `zod` schemas from `/validators/` for form validation.
- Never touch `/stores`, `/supabase`, or `/scripts`.

### State Agent

**Scope:** Zustand stores and data hooks.

**Rules:**

- One store per domain: `authStore`, `clientsStore`, `visitsStore`, `todayStore`.
- Stores handle all Supabase calls via `supabase-js`.
- `todayStore` must persist today's data to AsyncStorage for offline fallback.
- Expose loading, error, and data state for every async operation.
- Hooks in `/hooks/` are thin wrappers over stores (for component ergonomics).
- Never touch `/app`, `/components`, or `/supabase`.

### UI/UX Agent

**Scope:** Design system, visual consistency, and mobile UX standards.

**Responsibilities:**

- Own and maintain `/constants/theme.ts` (design tokens) and `/constants/brand.ts` (white-label config).
- Define component visual specs before the frontend agent builds them.
- Review screens and components for visual consistency and outdoor readability.
- Ensure all UI follows mobile UX best practices (touch targets, spacing, contrast).

**Design tokens (`/constants/theme.ts`):**

```
colors:
  background: #FFFFFF
  surface: #F5F5F5
  border: #E0E0E0
  text.primary: #111111
  text.secondary: #555555
  text.disabled: #AAAAAA
  primary: → from brand.ts
  success: #16A34A
  warning: #D97706
  error: #DC2626
  status.pending: #D97706    (amber)
  status.completed: #16A34A  (green)
  status.canceled: #9CA3AF   (gray)

typography (font sizes):
  xs: 12  sm: 14  base: 16  lg: 18  xl: 20  2xl: 24  3xl: 30

spacing scale: 4, 8, 12, 16, 20, 24, 32, 48, 64

border radius: sm(4) md(8) lg(12) xl(16) full(9999)
```

**White-label config (`/constants/brand.ts`):**

```
appName: string         # e.g. "Proar CRM"
primaryColor: string    # hex — the one brand color
logoUrl?: string        # optional local asset or URL
```

**Non-negotiable UI rules:**

- Minimum touch target: **48×48px**. Prefer 56px for primary actions.
- Minimum font size: **14px** for secondary text, **16px** for primary.
- Contrast ratio: minimum **4.5:1** (WCAG AA). Target 7:1 for body text.
- Status must be distinguishable without color alone — always pair with an icon or label.
- No hardcoded hex values, font sizes, or spacing values in components. Always reference `theme.ts`.
- Never touch `/stores`, `/supabase`, `/hooks`, or `/scripts`.

**Review checklist (before approving any screen):**

- [ ] All colors from `theme.ts` — no hardcoded hex
- [ ] Touch targets ≥ 48px
- [ ] Font sizes ≥ 14px
- [ ] Status indicators use both color and text/icon
- [ ] Consistent spacing from theme scale
- [ ] Readable in high-contrast / bright light conditions

---

### Scripts Agent

**Scope:** One-time scripts and data utilities.

**Rules:**

- Import script in `/scripts/import-excel.ts`.
- Deduplicate clients by `(name + address)` — case-insensitive trim.
- Rows with a date → create client + visit. Rows without date → create client only.
- Default time `10:00` (local) when date has no time component.
- If `notes` (minuta) is present on a dated row → status `completed`. Otherwise `completed` too.
- Script must be idempotent (safe to run multiple times).
- Never touch app source files.

---

## Conventions

### TypeScript

- `strict: true` always.
- Define all shared types in `/types/index.ts`.
- Use `zod` for runtime validation at boundaries (form input, API response).
- No `any`. Use `unknown` and narrow.

### Naming

- Files: `camelCase.ts` for utilities, `PascalCase.tsx` for components.
- Database: `snake_case` for tables and columns.
- TypeScript: `PascalCase` for types/interfaces, `camelCase` for variables/functions.
- Zustand stores: `use[Domain]Store` (e.g., `useVisitsStore`).

### Commits

- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`.
- Scope by domain: `feat(visits):`, `fix(today):`, `chore(db):`.

### Dates

- Always store as UTC in Supabase (`TIMESTAMPTZ`).
- Always display in local time using `dayjs`.
- Import `dayjs` from `/lib/dayjs.ts` (configured with locale).

---

## Definition of Done (PM+TL checklist)

Before marking any task `done`:

- [ ] Code follows file structure conventions
- [ ] All tables/columns are in English
- [ ] `owner_user_id` present on new tables, RLS policy created
- [ ] No Supabase calls outside of stores
- [ ] No `any` types
- [ ] Dates handled via `dayjs` from `/lib/dayjs.ts`
- [ ] Zod validation at form boundaries
- [ ] All colors/sizes reference `theme.ts` tokens — no hardcoded values
- [ ] Touch targets ≥ 48px for interactive elements
- [ ] `backlog.md` updated

---

## Excel Import Reference

**Source file:** `~/Downloads/GVEGA - REPORTE DE VISITAS PROAR.xlsx`

**Sheets:** `Etapa 1` (455 data rows), `Etapa 2` (38 rows). Skip `Hoja3`.

**Header row:** Row 4 (rows 1–3 are title metadata, skip them).

**Column mapping:**

| Excel Column         | DB Column                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| Fecha                | `visits.scheduled_at`                                                                                    |
| RUBRO                | `clients.industry`                                                                                       |
| Cliente              | `clients.name`                                                                                           |
| Domicilio            | `clients.address`                                                                                        |
| Localidad            | `clients.city`                                                                                           |
| Contacto             | `clients.contacts[0].name` (fallback name if none extracted from Tel 1)                                  |
| Tel 1                | `clients.contacts[*].phone` (parsed into multiple `ContactInfo` entries; names extracted from cell text) |
| Mail                 | `clients.contacts[*].email` (parsed; merged with phone entries by name when possible)                    |
| Minuta de la Reunión | `visits.notes`                                                                                           |

**Import rules:**

- Skip column A (always empty).
- Deduplicate clients: `LOWER(TRIM(name)) + LOWER(TRIM(address))`.
- Row with Fecha → create client (if new) + visit with status `completed`.
- Row without Fecha → create client only (no visit).
- Fecha with no time → default to `10:00` local time.
