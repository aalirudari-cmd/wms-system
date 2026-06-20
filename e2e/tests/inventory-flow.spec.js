import { test, expect } from './fixtures.js';
import { login, uniqueSku } from './helpers.js';

// The headline test: walk one product through its whole lifecycle and assert
// the stock figure after each step, including the oversell guard.
test('receive, scan and ship a product keeps stock correct', async ({ page }) => {
  const { sku, barcode, ref } = uniqueSku();
  const NAME = 'Test Item';

  await login(page, 'admin', 'admin123');

  // --- Create the product -------------------------------------------------
  await page.goto('/products');
  await page.getByRole('button', { name: 'New product' }).click();
  await page.fill('input[name="sku"]', sku);
  await page.fill('input[name="barcode"]', barcode);
  await page.fill('input[name="name"]', NAME);
  await page.fill('input[name="reorder_point"]', '5');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Product created.')).toBeVisible();

  // --- Receive 40 into A-01-01 -------------------------------------------
  await receiveOrShip(page, { section: 'receiving', action: 'New receipt', ref: `${ref}-R`, sku, qty: 40, finalise: 'Post receipt' });
  await expectOnHand(page, barcode, '40 EA');

  // --- Ship 10 out --------------------------------------------------------
  await receiveOrShip(page, { section: 'shipping', action: 'New shipment', ref: `${ref}-S`, sku, qty: 10, finalise: 'Ship order' });
  await expectOnHand(page, barcode, '30 EA');

  // --- The audit trail records both moves --------------------------------
  await page.goto('/movements');
  await expect(page.getByText(sku).first()).toBeVisible();

  // --- Oversell guard: shipping 9999 is rejected, stock unchanged --------
  await page.goto('/shipping');
  await page.getByRole('button', { name: 'New shipment' }).click();
  await page.getByTestId('doc-reference').fill(`${ref}-X`);
  await selectByText(page.getByTestId('line-product').first(), sku);
  await page.getByTestId('line-location').first().selectOption({ label: 'A-01-01' });
  await page.getByTestId('line-qty').first().fill('9999');
  await page.getByRole('button', { name: 'Create draft' }).click();
  await openDoc(page, `${ref}-X`);
  await page.getByRole('button', { name: 'Ship order' }).click();
  await expect(page.locator('.toast.err')).toContainText(/not enough stock/i);

  await expectOnHand(page, barcode, '30 EA');
});

// Build a draft document with one line and finalise it.
async function receiveOrShip(page, { section, action, ref, sku, qty, finalise }) {
  await page.goto(`/${section}`);
  await page.getByRole('button', { name: action }).click();
  await page.getByTestId('doc-reference').fill(ref);
  await selectByText(page.getByTestId('line-product').first(), sku);
  await page.getByTestId('line-location').first().selectOption({ label: 'A-01-01' });
  await page.getByTestId('line-qty').first().fill(String(qty));
  await page.getByRole('button', { name: 'Create draft' }).click();
  await openDoc(page, ref);
  await page.getByRole('button', { name: finalise }).click();
  await expect(page.getByText(new RegExp(`${finalise.split(' ')[0]}|posted|shipped`, 'i')).first()).toBeVisible();
}

// Open a document row by its reference.
async function openDoc(page, ref) {
  await page.getByRole('row', { name: new RegExp(ref) }).getByRole('button', { name: 'Open' }).click();
}

// Look the product up on the Scan station and assert its on-hand readout.
async function expectOnHand(page, barcode, expected) {
  await page.goto('/scan');
  await page.locator('input.mono').first().fill(barcode);
  await page.getByRole('button', { name: 'Look up' }).click();
  await expect(page.getByText(expected, { exact: false }).first()).toBeVisible();
}

// Select an <option> by its visible text (robust to unknown option values).
async function selectByText(select, text) {
  const value = await select.locator('option', { hasText: text }).getAttribute('value');
  await select.selectOption(value);
}
