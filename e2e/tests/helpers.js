import { expect } from '@playwright/test';

// Sign in and wait for the admin shell to land on the dashboard route.
export async function login(page, username, password) {
  await page.goto('/login');
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

// Unique identifiers so the suite is safe to re-run against the same database.
export function uniqueSku() {
  const n = Date.now().toString().slice(-9);
  return { sku: `E2E-${n}`, barcode: `8${n}000`.slice(0, 13), ref: `E2E-${n}` };
}
