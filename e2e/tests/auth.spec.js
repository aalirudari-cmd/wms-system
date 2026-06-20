import { test, expect } from './fixtures.js';
import { login } from './helpers.js';

test('signs in with valid credentials', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('rejects a wrong password', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[autocomplete="username"]', 'admin');
  await page.fill('input[type="password"]', 'definitely-wrong');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('.login-error')).toContainText(/incorrect/i);
  await expect(page).toHaveURL(/\/login$/);
});

test('signs out back to the login screen', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
