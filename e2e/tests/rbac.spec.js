import { test, expect } from './fixtures.js';
import { login } from './helpers.js';

test('a worker cannot see or reach Reports and Users', async ({ page }) => {
  await login(page, 'worker', 'worker123');
  await expect(page.getByRole('link', { name: 'Reports' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);

  // Direct navigation is bounced back to the dashboard by the route guard.
  await page.goto('/users');
  await expect(page).toHaveURL(/\/$/);
});

test('an admin can reach Users and Reports', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Reports' })).toBeVisible();
});
