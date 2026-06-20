import { test as base, expect } from '@playwright/test';

// Thin wrapper that surfaces uncaught page JavaScript errors in the test log,
// which makes UI failures much easier to diagnose. Does not fail the test by
// itself — assertions decide pass/fail.
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await use(page);
    if (errors.length) console.error('Uncaught page errors:', errors);
  },
});

export { expect };
