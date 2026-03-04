# UI Component Specifications

> **Audience:** frontend engineers and designers.
> **Source of truth for tokens:** `/constants/theme.ts` and `/constants/brand.ts`.
> All measurements use the 4-point spacing grid from `theme.spacing`.
> All colors reference `theme.colors`; no hardcoded hex values inside components.

---

## 1. Button

### Variants

| Variant     | Background            | Text / Icon color      | Border                     | Use case                        |
|-------------|----------------------|------------------------|----------------------------|---------------------------------|
| `primary`   | `colors.primary`     | `colors.textOnPrimary` | none                       | Main call-to-action             |
| `secondary` | `colors.surface`     | `colors.primary`       | 1.5px `colors.primary`     | Secondary action on same screen |
| `ghost`     | `transparent`        | `colors.primary`       | none                       | Inline / low-emphasis action    |
| `danger`    | `colors.error`       | `colors.textOnPrimary` | none                       | Destructive action              |

### States

| State      | Visual change                                                         |
|------------|-----------------------------------------------------------------------|
| `default`  | As described above                                                    |
| `loading`  | Replace label with `ActivityIndicator`; keep same dimensions; disable press |
| `disabled` | Opacity `0.4`; `pointerEvents: 'none'`                               |

### Props summary

```ts
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'  // default: 'primary'
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  icon?: React.ReactNode   // rendered left of label
  size?: 'sm' | 'md' | 'lg'  // default: 'md'
}
```

### Visual rules

- Minimum height: `MIN_TOUCH_TARGET` (48px) for `md` and `lg`; 36px for `sm`.
- Minimum width: 80px.
- Horizontal padding: `spacing[4]` (16px) for `sm`; `spacing[6]` (24px) for `md`/`lg`.
- Border radius: `borderRadius.md` (8px).
- Font size: `fontSize.base` (16px) for `md`; `fontSize.sm` (14px) for `sm`; `fontSize.lg` (18px) for `lg`.
- Font weight: `fontWeight.semibold`.
- Label must be a single line (no wrapping).
- Icon gap from label: `spacing[2]` (8px).

### Do / Don't

- **Do** use `primary` for the single most important action on a screen.
- **Do** always provide an accessible `accessibilityLabel` when using icon-only buttons.
- **Don't** place two `primary` buttons side-by-side on the same screen.
- **Don't** use `ghost` for destructive actions.
- **Don't** shrink the button below `MIN_TOUCH_TARGET` height for `md`/`lg` sizes.

---

## 2. Card

### Variants

| Variant      | Description                                                   |
|--------------|---------------------------------------------------------------|
| `default`    | Static container; non-interactive                             |
| `pressable`  | Wrapped in `Pressable`; receives pressed visual feedback      |

### Props summary

```ts
type CardProps = {
  variant?: 'default' | 'pressable'  // default: 'default'
  onPress?: () => void               // required when variant='pressable'
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}
```

### Visual rules

- Background: `colors.surface`.
- Border: 1px `colors.border`.
- Border radius: `borderRadius.lg` (12px).
- Padding: `spacing[4]` (16px).
- Shadow: `shadows.subtle`.
- Pressed state (pressable only): reduce opacity to `0.85`; scale `0.99`.
- No minimum height enforced — content determines height.

### Do / Don't

- **Do** use `pressable` whenever the card navigates somewhere or triggers an action.
- **Do** keep card padding consistent; don't override it per-instance unless there is a documented reason.
- **Don't** nest `Pressable` elements inside a `pressable` card — move those actions outside or use a `default` card.
- **Don't** add a second shadow layer on top of cards.

---

## 3. Input

### Variants

| Variant   | Border color          | Description                              |
|-----------|-----------------------|------------------------------------------|
| `default` | `colors.border`       | Normal state                             |
| `focused` | `colors.primary`      | When the field has focus (auto-applied)  |
| `error`   | `colors.error`        | Validation failed                        |

### Props summary

```ts
type InputProps = {
  label: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  errorMessage?: string      // if defined, renders error variant
  helperText?: string        // shown below field when no error
  disabled?: boolean
  secureTextEntry?: boolean
  keyboardType?: KeyboardTypeOptions
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  multiline?: boolean
  numberOfLines?: number     // only meaningful when multiline=true
  accessibilityLabel?: string
}
```

### Visual rules

- Label: always positioned **above** the field. Font size `fontSize.sm` (14px), weight `fontWeight.medium`, color `colors.textSecondary`.
- Gap between label and field: `spacing[1]` (4px).
- Field minimum height: 48px (single-line); 80px (multiline).
- Field background: `colors.surface`.
- Field border: 1.5px, color per variant above.
- Border radius: `borderRadius.md` (8px).
- Inner horizontal padding: `spacing[3]` (12px).
- Font size: `fontSize.base` (16px).
- Error message: positioned **below** the field. Font size `fontSize.sm` (14px), color `colors.error`. Rendered only when `errorMessage` is defined.
- Helper text: same position as error message but color `colors.textSecondary`. Hidden when `errorMessage` is defined.
- Disabled state: background `colors.background`, text `colors.textDisabled`, pointer events none.

### Do / Don't

- **Do** always provide a visible `label`; do not rely on placeholder text alone.
- **Do** show the error message immediately after the user leaves the field (on blur).
- **Don't** use the error variant proactively before the user has interacted with the field.
- **Don't** stack more than one error message below a single field.

---

## 4. Badge

A compact label used to communicate categorical information (not visit status — use `StatusBadge` for that).

### Variants

| Variant   | Background                  | Text color           |
|-----------|-----------------------------|----------------------|
| `success` | `colors.successLight`       | `colors.success`     |
| `warning` | `colors.warningLight`       | `colors.warning`     |
| `error`   | `colors.errorLight`         | `colors.error`       |
| `neutral` | `colors.statusCanceledLight`| `colors.textSecondary` |

### Props summary

```ts
type BadgeProps = {
  label: string
  variant?: 'success' | 'warning' | 'error' | 'neutral'  // default: 'neutral'
}
```

### Visual rules

- Height: 22px.
- Horizontal padding: `spacing[2]` (8px).
- Border radius: `borderRadius.full` (9999px) — pill shape.
- Font size: `fontSize.xs` (12px), weight `fontWeight.semibold`.
- Single line; truncate with ellipsis after 20 characters.
- No icon.

### Do / Don't

- **Do** keep badge labels short (1–3 words).
- **Don't** use Badge for visit statuses; use `StatusBadge` instead.
- **Don't** make a Badge interactive (no `onPress`).

---

## 5. StatusBadge

Specialized badge for the three visit workflow states. Must display both an icon and a text label.

### Variants

| Status      | Icon             | Label       | Background                      | Text / icon color         |
|-------------|------------------|-------------|---------------------------------|---------------------------|
| `pending`   | `clock-outline`  | Pending     | `colors.statusPendingLight`     | `colors.statusPending`    |
| `completed` | `check-circle`   | Completed   | `colors.statusCompletedLight`   | `colors.statusCompleted`  |
| `canceled`  | `close-circle`   | Canceled    | `colors.statusCanceledLight`    | `colors.statusCanceled`   |

(Icon names reference `@expo/vector-icons` / MaterialCommunityIcons family.)

### Props summary

```ts
type VisitStatus = 'pending' | 'completed' | 'canceled'

type StatusBadgeProps = {
  status: VisitStatus
}
```

### Visual rules

- Height: 26px.
- Horizontal padding: `spacing[2]` (8px).
- Border radius: `borderRadius.full` (9999px).
- Icon size: 14px, vertically centered with label.
- Gap between icon and label: `spacing[1]` (4px).
- Font size: `fontSize.xs` (12px), weight `fontWeight.semibold`.
- No `onPress`; always non-interactive.

### Do / Don't

- **Do** use `StatusBadge` exclusively for visit workflow states.
- **Don't** add new variants to `StatusBadge` for other domains; create a generic `Badge` for those.
- **Don't** hide the icon — the icon is required for outdoor readability and accessibility.

---

## 6. Banner

Full-width informational strip anchored at the top of the screen (below the header). Used for app-level alerts.

### Variants

| Variant    | Background            | Icon                    | Text color               | Use case                      |
|------------|-----------------------|-------------------------|--------------------------|-------------------------------|
| `info`     | `colors.primaryLight` | `information-outline`   | `colors.primary`         | General information           |
| `warning`  | `colors.warningLight` | `alert-outline`         | `colors.warning`         | Non-critical caution          |
| `offline`  | `colors.statusCanceledLight` | `wifi-off`       | `colors.textSecondary`   | No network connectivity       |

### Props summary

```ts
type BannerProps = {
  variant: 'info' | 'warning' | 'offline'
  message: string
  onDismiss?: () => void   // if defined, renders a close (X) button on the right
}
```

### Visual rules

- Width: 100% of the screen.
- Minimum height: 48px.
- Vertical padding: `spacing[3]` (12px).
- Horizontal padding: `spacing[4]` (16px).
- Icon size: 18px, vertically centered with text.
- Gap between icon and text: `spacing[2]` (8px).
- Font size: `fontSize.sm` (14px), weight `fontWeight.medium`.
- Text wraps to multiple lines if needed.
- Dismiss button: icon only (`close`), 24px, aligned to the right edge. Minimum touch area `MIN_TOUCH_TARGET`.

### Do / Don't

- **Do** show the `offline` banner any time network connectivity is lost.
- **Do** allow dismissal for `info` banners; `offline` banners must not be dismissible (they disappear when connectivity is restored).
- **Don't** stack more than one banner at a time.
- **Don't** use Banner for validation errors inside forms; use `Input` `errorMessage` for that.

---

## 7. ListItem

A single row within a scrollable list (clients list, visits list, etc.).

### Props summary

```ts
type ListItemProps = {
  title: string
  subtitle?: string
  leading?: React.ReactNode    // avatar, icon, or status indicator on the left
  trailing?: React.ReactNode   // defaults to a right-chevron icon
  onPress?: () => void
  showDivider?: boolean        // renders a 1px divider below the row (default: true)
}
```

### Visual rules

- Minimum height: **64px**.
- Horizontal padding: `spacing[4]` (16px).
- Vertical padding: `spacing[3]` (12px).
- Leading area: fixed width 40px, vertically centered.
- Gap between leading area and text block: `spacing[3]` (12px).
- Title: `fontSize.base` (16px), `fontWeight.medium`, `colors.textPrimary`, single line with ellipsis.
- Subtitle: `fontSize.sm` (14px), `fontWeight.regular`, `colors.textSecondary`, single line with ellipsis.
- Trailing area: fixed width 24px, vertically centered.
- Default trailing icon: `chevron-right`, size 20px, color `colors.textSecondary`.
- Divider: 1px, color `colors.border`, inset by leading-area width + leading gap (56px from left edge).
- Pressed state: background `colors.background`.

### Do / Don't

- **Do** always provide an `onPress` when using `ListItem` inside a navigable list.
- **Do** include a `leading` element to aid quick scanning in bright outdoor conditions.
- **Don't** let the row height go below 64px — this is critical for outdoor usability.
- **Don't** use `ListItem` inside a `FlatList` with `removeClippedSubviews={false}` on long lists; keep performance defaults.
- **Don't** put interactive elements (buttons, toggles) inside the trailing area alongside a chevron — choose one or the other.
