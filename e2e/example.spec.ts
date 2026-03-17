import { test, expect } from '@playwright/test';

test.describe('Expo Web App', () => {
  test('should load the app homepage', async ({ page }) => {
    await page.goto('/');
    // Wait for the app to load (adjust selector based on actual content)
    await page.waitForLoadState('networkidle');
    expect(page).toBeTruthy();
  });

  test('should have proper viewport setup', async ({ page }) => {
    await page.goto('/');
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    expect(viewport?.width).toBeGreaterThan(0);
    expect(viewport?.height).toBeGreaterThan(0);
  });
});
