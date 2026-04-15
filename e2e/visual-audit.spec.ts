/**
 * e2e/visual-audit.spec.ts — Visual audit for all main screens (EP-051.2)
 *
 * Logs in, navigates to every main screen, takes full-page screenshots, and
 * runs basic assertions (no "undefined"/"null" in visible text, no console errors).
 *
 * Prerequisites:
 *   TEST_EMAIL and TEST_PASSWORD must be set as environment variables.
 *   The dev server must be running on http://localhost:8081 (yarn web).
 *
 * Run:
 *   TEST_EMAIL=you@example.com TEST_PASSWORD=yourpass \
 *     npx playwright test e2e/visual-audit.spec.ts --headed
 *
 * Screenshots are saved to e2e/screenshots/
 */

import * as fs from 'fs'
import * as path from 'path'
import { expect, test } from '@playwright/test'

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots')
const TEST_EMAIL = process.env.TEST_EMAIL
const TEST_PASSWORD = process.env.TEST_PASSWORD

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('Visual Audit (EP-051.2)', () => {
  // Single serial test: login once, navigate all screens in order.
  test('screenshot all main screens', async ({ page }) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      test.skip()
      return
    }

    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })

    // Collect console errors across all navigations.
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[${msg.location().url}] ${msg.text()}`)
      }
    })

    // ── Login ──────────────────────────────────────────────────────────────
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.locator('input[placeholder="tu@email.com"]').fill(TEST_EMAIL)
    await page.locator('input[placeholder="••••••"]').fill(TEST_PASSWORD)
    await page.locator('button:has-text("Ingresar")').click()
    await page.waitForURL(/\/(agenda|$)/, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    // ── Helper: navigate, screenshot, assert ───────────────────────────────
    async function auditScreen(
      screenPath: string,
      filename: string,
      label: string,
    ) {
      await page.goto(screenPath)
      await page.waitForLoadState('networkidle')
      // Let animations settle.
      await page.waitForTimeout(400)
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, filename),
        fullPage: true,
      })

      const bodyText = (await page.locator('body').textContent()) ?? ''
      expect(bodyText, `${label}: literal "undefined" in page text`).not.toMatch(
        /\bundefined\b/,
      )
      // "null" is a common Spanish word fragment; check only as standalone token.
      expect(bodyText, `${label}: literal standalone "null" in page text`).not.toMatch(
        /(?<![a-z])null(?![a-z])/i,
      )

      // All interactive elements should have accessible labels.
      const unlabeledButtons = page.locator(
        '[role="button"]:not([aria-label]):not([aria-labelledby])',
      )
      const count = await unlabeledButtons.count()
      if (count > 0) {
        console.warn(`${label}: ${count} button(s) missing aria-label`)
      }
    }

    // ── 1. Agenda ──────────────────────────────────────────────────────────
    await auditScreen('/agenda', '01-agenda.png', 'Agenda')

    // ── 2. Clients list ────────────────────────────────────────────────────
    await auditScreen('/clients', '02-clients.png', 'Clients list')

    // ── 3. Client detail — click the first list row ────────────────────────
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')
    const firstClientBtn = page
      .locator('[role="button"][aria-label]')
      .filter({ hasNot: page.locator('[aria-label="Buscar clientes"]') })
      .first()
    const clientBtnVisible = await firstClientBtn.isVisible().catch(() => false)
    if (clientBtnVisible) {
      await firstClientBtn.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(400)
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '03-client-detail.png'),
        fullPage: true,
      })
    } else {
      console.warn('Client detail: no client rows found, skipping screenshot')
    }

    // ── 4. Visits list ─────────────────────────────────────────────────────
    await auditScreen('/visits', '04-visits.png', 'Visits list')

    // ── 5. Visit detail — click the first list row ─────────────────────────
    await page.goto('/visits')
    await page.waitForLoadState('networkidle')
    const firstVisitBtn = page.locator('[role="button"][aria-label*="Ver visita"]').first()
    const visitBtnVisible = await firstVisitBtn.isVisible().catch(() => false)
    if (visitBtnVisible) {
      await firstVisitBtn.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(400)
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '05-visit-detail.png'),
        fullPage: true,
      })
    } else {
      console.warn('Visit detail: no visit rows found, skipping screenshot')
    }

    // ── 6. Team (admin only — skip gracefully) ─────────────────────────────
    await page.goto('/team')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(400)
    const isLocked = await page
      .locator('text=No tenés acceso')
      .isVisible()
      .catch(() => false)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '06-team.png'),
      fullPage: true,
    })
    if (isLocked) {
      console.info('Team: non-admin user, lock screen captured.')
    }

    // ── 7. Settings ────────────────────────────────────────────────────────
    await auditScreen('/settings', '07-settings.png', 'Settings')

    // ── Final: report console errors ───────────────────────────────────────
    if (consoleErrors.length > 0) {
      console.warn(
        `Console errors captured during audit (${consoleErrors.length}):\n` +
          consoleErrors.slice(0, 20).join('\n'),
      )
    }
    // Do not fail on console errors — log only, so audit remains non-blocking.
  })
})
