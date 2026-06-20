import { test, expect } from './fixtures.js';
import { login } from './helpers.js';

// Runs under the 'mobile' project (390px viewport) where the home screen
// becomes the PDA launcher menu.
test('handheld home shows the launcher menu', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  await expect(page.locator('.menu-tile')).toHaveCount(8); // admin sees every tile
  await expect(page.locator('.menu-tile').filter({ hasText: 'Receiving' })).toBeVisible();
});

test('a launcher tile navigates into its section', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  await page.locator('.menu-tile').filter({ hasText: 'Inventory' }).click();
  await expect(page).toHaveURL(/\/inventory$/);
});
