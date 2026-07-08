import { test, expect } from './fixtures.js';
import { login } from './helpers.js';

test('a picker cannot see or reach Users and Roles', async ({ page }) => {
  await login(page, 'picker', 'picker123');
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Roles & Permissions' })).toHaveCount(0);

  // Direct navigation is bounced back to the dashboard by the route guard.
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/admin$/);
});

test('an admin can reach Users and Roles', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Roles & Permissions' })).toBeVisible();
});

test('an admin can regrant a role permission at runtime', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  await page.goto('/admin/roles');
  await page.getByRole('tab', { name: 'Viewer' }).click();
  // A plain toggle always dirties the form (whatever the persisted state),
  // which is what enables the Save button — keeping this test idempotent
  // across re-runs against the same database.
  const checkbox = page.locator('label', { hasText: 'inventory:adjust' }).locator('input[type=checkbox]').first();
  await checkbox.click();
  await page.getByRole('button', { name: 'Save permissions' }).click();
  await expect(page.getByText(/permissions updated/i)).toBeVisible();
});
