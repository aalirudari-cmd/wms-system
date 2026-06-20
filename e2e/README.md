# End-to-end tests (Playwright)

Browser tests that drive the real UI — login, roles, and the full
receive → scan → ship stock lifecycle including the oversell guard.

## Prerequisites

The app must be running and seeded with demo data (`SEED_DEMO=true`, the
default). The simplest way is:

```bash
# from the repo root
docker compose up -d --build
```

That serves the app at http://localhost:8080, which is the default base URL.

## Install & run

```bash
cd e2e
npm install
npx playwright install chromium   # first time only: download the browser
npm test                          # run the whole suite
```

Useful variants:

```bash
BASE_URL=http://localhost:5173 npm test   # point at the Vite dev server instead
npm run test:headed                       # watch it drive a real browser
npm run report                            # open the last HTML report
```

## What's covered

| Spec | Checks |
|------|--------|
| `auth.spec.js` | Valid login, wrong-password error, sign-out |
| `rbac.spec.js` | Worker can't see/reach Reports & Users; admin can |
| `inventory-flow.spec.js` | Create product → receive 40 → scan shows 40 → ship 10 → scan shows 30 → movements logged → oversell of 9999 is rejected and stock stays 30 |
| `mobile.spec.js` | 390px handheld home renders the launcher menu; a tile navigates |

The suite creates a uniquely-named product each run, so it's safe to run
repeatedly against the same database.
