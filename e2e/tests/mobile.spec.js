import { test, expect } from './fixtures.js';
import { login } from './helpers.js';

// Runs under the 'mobile' project (390px viewport). The dedicated PDA app at
// /pda is the barcode-first launcher for handheld scanners.
test('the PDA launcher shows scan actions', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  await page.goto('/pda');
  await expect(page.getByRole('heading', { name: 'What are you doing?' })).toBeVisible();
  // "Receive"/"Put Away" appear both as launcher tiles and in the bottom nav;
  // scope to the main launcher grid.
  await expect(page.getByRole('main').getByRole('link', { name: 'Receive' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Put Away' })).toBeVisible();
});

test('a launcher tile navigates into its scan workflow', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  await page.goto('/pda');
  await page.getByRole('main').getByRole('link', { name: 'Put Away' }).click();
  await expect(page).toHaveURL(/\/pda\/putaway$/);
});
