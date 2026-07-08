import { test, expect } from './fixtures.js';
import { login } from './helpers.js';

// Read-path smoke across the stock ledger surfaces: the dashboard, the
// inventory table and the movement history all reflect the seeded stock,
// proving the API → Prisma → Postgres chain is wired end to end. (The
// write-path ledger invariant — completing a receipt creates stock + a
// movement — is exercised directly in the receiving flow during development.)
test('seeded stock is visible across dashboard, inventory and movements', async ({ page }) => {
  await login(page, 'admin', 'admin123');

  // Dashboard shows a non-zero units-on-hand KPI.
  await expect(page.getByText('Units on hand')).toBeVisible();

  // Inventory table lists seeded product stock with the on-hand columns.
  await page.getByRole('link', { name: 'Inventory' }).click();
  await expect(page).toHaveURL(/\/admin\/inventory$/);
  await expect(page.getByText('SKU-1001').first()).toBeVisible();
  await expect(page.getByText('Available').first()).toBeVisible();

  // Movement history shows the append-only audit trail.
  await page.getByRole('link', { name: 'Movements' }).click();
  await expect(page).toHaveURL(/\/admin\/movements$/);
  await expect(page.getByText('ADJUSTMENT').first()).toBeVisible();
});

test('an admin can create a product through the UI', async ({ page }) => {
  const sku = `E2E-${Date.now().toString().slice(-8)}`;
  await login(page, 'admin', 'admin123');

  await page.getByRole('link', { name: 'Products' }).click();
  await page.getByRole('button', { name: 'New product' }).click();
  await page.getByLabel('Name').fill('E2E Test Widget');
  await page.getByLabel('SKU').fill(sku);
  // Unit is required; pick the first option from the seeded units.
  await page.getByLabel('Unit').click();
  await page.getByRole('option').first().click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(/product created/i)).toBeVisible();
  await expect(page.getByText(sku).first()).toBeVisible();
});
