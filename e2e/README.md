# E2E Tests — Playwright with Expo Web

This directory contains end-to-end tests for the CRM Proar Pilar web application, using [Playwright](https://playwright.dev/) to test against the Expo web target.

## Quick Start

### Run all tests
```bash
yarn test:e2e
```

### Run tests in UI mode (interactive)
```bash
yarn test:e2e:ui
```

### Debug a specific test
```bash
yarn test:e2e:debug
```

### Run a specific test file
```bash
yarn test:e2e -- e2e/example.spec.ts
```

## How it Works

1. **Web Server:** The test suite automatically starts the Expo web dev server (`yarn web`) on `http://localhost:8081`.
2. **Browsers:** Tests run on Chromium and Firefox by default.
3. **Reusable Server:** If tests are interrupted, the next run will reuse the existing server (unless `CI=1` is set).

## Test Structure

Tests are organized by feature area:

- **`example.spec.ts`** — Sanity checks (page loads, viewport)
- **`auth.spec.ts`** (planned) — Login / logout flows
- **`clients.spec.ts`** (planned) — Client list, detail, CRUD
- **`visits.spec.ts`** (planned) — Visit scheduling, notes, completion
- **`today.spec.ts`** (planned) — Today dashboard, agenda display
- **`email.spec.ts`** (planned) — Email scheduling and sending

## File Naming

All test files must end with `.spec.ts` (e.g., `clients.spec.ts`, `visits.spec.ts`).

## Writing Tests

### Basic Example
```typescript
import { test, expect } from '@playwright/test';

test('should navigate to clients page', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Clients');
  await expect(page).toHaveURL(/.*clients/);
});
```

### Common Patterns

**Wait for navigation:**
```typescript
await page.click('a[href="/visits"]');
await page.waitForURL(/.*visits/);
```

**Fill forms:**
```typescript
await page.fill('input[type="text"]', 'New Client');
await page.click('button[type="submit"]');
```

**Check visibility:**
```typescript
const button = page.locator('button:has-text("Save")');
await expect(button).toBeVisible();
```

See [Playwright documentation](https://playwright.dev/docs/writing-tests) for more patterns.

## Configuration

Config file: `playwright.config.ts` (project root)

Key settings:
- **baseURL:** `http://localhost:8081` (Expo web dev server)
- **webServer:** Automatically starts `yarn web` before tests
- **browsers:** Chromium, Firefox
- **trace:** Captures on first retry (useful for debugging)
- **screenshot:** Captures only on failure

## CI/CD

In CI environments, set `CI=1`:

```bash
CI=1 yarn test:e2e
```

This disables server reuse and enables stricter retry behavior.

## Debugging

### View Test Report
After a test run, open the HTML report:
```bash
npx playwright show-report
```

### Debug Mode
Run tests with the Playwright Inspector:
```bash
yarn test:e2e:debug
```

### Slow Motion
See tests run step-by-step:
```bash
yarn test:e2e -- --headed --slow-mo=1000
```

## Troubleshooting

### Port 8081 already in use
Kill any existing Expo processes:
```bash
lsof -i :8081 | awk 'NR==2 {print $2}' | xargs kill -9
```

### Tests timeout
Increase timeout in test:
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ...
});
```

### App doesn't load
Check that the Expo web dev server is running properly:
```bash
yarn web
```

If it fails to start, check `.expo/` directory or try clearing cache:
```bash
rm -rf .expo node_modules && yarn install && yarn web
```

## Next Steps

After basic setup, implement:
1. **Auth tests** — Login with test credentials
2. **Import tests** — Excel upload and data validation
3. **Visit flow tests** — Create, update, complete visits
4. **Email tests** — Trigger and verify email sending
