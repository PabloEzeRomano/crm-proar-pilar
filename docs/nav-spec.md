# Navigation Specification

> **Stack:** Expo Router v3 (file-system routing), React Navigation under the hood.
> **Layout file convention:** `_layout.tsx` at each folder level.
> All color values come from `theme.colors` / `brand`; no hardcoded hex values in navigation config.

---

## 1. Tab Bar

The root navigator is a bottom tab bar with **3 tabs**.

| # | Tab name | Icon (MaterialCommunityIcons) | Route           |
|---|----------|-------------------------------|-----------------|
| 1 | Today    | `home-outline` / `home`       | `/(tabs)/`      |
| 2 | Clients  | `account-group-outline` / `account-group` | `/(tabs)/clients/` |
| 3 | Visits   | `calendar-outline` / `calendar` | `/(tabs)/visits/` |

### Tab bar visual rules

- Position: **bottom** of the screen (native tab bar).
- Background: `colors.surface`.
- Top border: 1px `colors.border`.
- Active icon + label color: `brand.primaryColor`.
- Inactive icon + label color: `colors.textSecondary`.
- Label font size: `fontSize.xs` (12px).
- Icon size: 24px.
- Tab bar height: platform default (automatically accounts for the home indicator on iOS).
- Haptic feedback on tab press: yes (light impact).

---

## 2. Screen Map

### Auth group — `/(auth)/`

| Route             | Screen title | Tab       | Description                                  |
|-------------------|--------------|-----------|----------------------------------------------|
| `/(auth)/login`   | Login        | (none)    | Email + password form. Redirects to `/(tabs)/` on success. No back button. |

### Tab group — `/(tabs)/`

#### Today tab

| Route        | Screen title     | Tab   | Description                                                          |
|--------------|------------------|-------|----------------------------------------------------------------------|
| `/(tabs)/`   | Today            | Today | Dashboard showing today's scheduled visits, summary cards, and quick-access actions. |

#### Clients tab

| Route                      | Screen title    | Tab     | Description                                                               |
|----------------------------|-----------------|---------|---------------------------------------------------------------------------|
| `/(tabs)/clients/`         | Clients         | Clients | Searchable flat list of all clients. Tapping a row pushes `[id]`.         |
| `/(tabs)/clients/[id]`     | Client Detail   | Clients | Client profile: name, contact info, address, visit history. Edit button in header. |

#### Visits tab

| Route                     | Screen title   | Tab    | Description                                                                           |
|---------------------------|----------------|--------|---------------------------------------------------------------------------------------|
| `/(tabs)/visits/`         | Visits         | Visits | Filterable list of all visits (by date / status). Tapping a row pushes `[id]`.        |
| `/(tabs)/visits/[id]`     | Visit Detail   | Visits | Visit info, status badge, notes form, and a mark-complete action. Edit opens a modal. |

#### Settings (accessible from Today tab header)

| Route                  | Screen title | Tab   | Description                                                     |
|------------------------|--------------|-------|-----------------------------------------------------------------|
| `/(tabs)/settings`     | Settings     | Today | Email configuration (SMTP / outbox settings). Reached via a gear icon in the Today header. |

---

## 3. Navigation Patterns

### Stack navigation (push)

Used for all **detail** screens within a tab:

- `/(tabs)/clients/` → push → `/(tabs)/clients/[id]`
- `/(tabs)/visits/` → push → `/(tabs)/visits/[id]`

Each tab has its own independent navigation stack so that back-navigation stays within the tab context.

### Modal navigation

Used for **create** and **edit** forms:

- Create new client → modal sheet from `/(tabs)/clients/`
- Create new visit → modal sheet from `/(tabs)/visits/` or `/(tabs)/`
- Edit client → modal sheet from `/(tabs)/clients/[id]`
- Edit visit → modal sheet from `/(tabs)/visits/[id]`

Modal presentation: `presentation: 'modal'` (iOS card-style sheet; Android slide-up).
Modals always have a **Cancel** button (top-left) and a **Save** button (top-right).
Tapping the background or dragging down dismisses the modal with a discard-changes confirmation if the form is dirty.

### Back navigation

- A back button (left arrow) is always visible on any screen that has a parent in the stack.
- Back label: hidden (arrow icon only — see Header rules below).
- Swipe-back gesture: enabled on iOS.

### Authentication guard

- The root layout redirects unauthenticated users to `/(auth)/login`.
- After successful login, the user is redirected to `/(tabs)/` and the auth stack is popped from history.
- Logging out from Settings clears the session and redirects to `/(auth)/login`.

---

## 4. Header Rules

### General rules

- Title: **centered** horizontally.
- Font size: `fontSize.lg` (18px), weight `fontWeight.semibold`, color `colors.textPrimary`.
- Back button label: **hidden** — show the left-arrow icon only (`chevron-left`, size 24px, color `colors.primary`).
- Header background: `colors.surface`.
- Header border bottom: 1px `colors.border` (default shadow removed).

### Action buttons (right side)

| Screen                    | Right action                           |
|---------------------------|----------------------------------------|
| `/(tabs)/`                | Gear icon → navigate to `/(tabs)/settings` |
| `/(tabs)/clients/[id]`    | "Edit" text button → open edit modal   |
| `/(tabs)/visits/[id]`     | "Edit" text button → open edit modal   |
| `/(tabs)/settings`        | (none)                                 |
| `/(auth)/login`           | (none)                                 |

Right action buttons:
- Text buttons: `fontSize.base` (16px), color `colors.primary`, weight `fontWeight.medium`.
- Icon buttons: 24px icon, minimum touch area `MIN_TOUCH_TARGET` (48px).

### Modal headers

- Left: **Cancel** text button (`colors.error` or `colors.textSecondary`).
- Center: modal title (same rules as above).
- Right: **Save** text button (`colors.primary`, `fontWeight.semibold`). Disabled and opacity 0.4 when form is invalid or unchanged.

### Screen-specific notes

- `/(auth)/login`: no header rendered (full-screen auth layout).
- `/(tabs)/` (Today): show the current date as a subtitle below the "Today" title.
