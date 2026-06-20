# Stockhaus — Warehouse Management System

A full-stack WMS for receiving, storing, picking and shipping stock — built for
the warehouse floor (handheld PDA scanners), the office (desktop dashboards) and
everything in between.

```
React + Vite  ──/api──►  Node + Express  ──►  PostgreSQL
   (nginx)                  (REST, JWT)          (pg)
```

## Features

| Area | What it does |
|------|--------------|
| **Inventory** | Live stock-on-hand by product × location, manual adjustments, transfers |
| **Barcode scanning** | Scan station with keyboard-wedge support (PDA scanners) + native camera scanning where available |
| **Receiving** | Draft goods receipts with lines; posting adds stock and records movements |
| **Shipping** | Draft shipments; shipping deducts stock (fails safely if short) |
| **Stock movements** | Append-only audit trail of every change, filterable by type |
| **Roles** | Admin / Manager / Worker, enforced on both the API and the UI |
| **Dashboard & reports** | KPIs, 7-day throughput chart, low-stock, top movers, CSV export |
| **Responsive** | Desktop sidebar, handheld bottom-nav with a prominent Scan button, mobile drawer |

## Roles & permissions

| Capability | Worker | Manager | Admin |
|------------|:------:|:-------:|:-----:|
| Scan, view inventory & movements | ✓ | ✓ | ✓ |
| Receive, ship, adjust, transfer stock | ✓ | ✓ | ✓ |
| Create/edit products & locations | | ✓ | ✓ |
| Reports & CSV export | | ✓ | ✓ |
| Manage users | | | ✓ |

## Quick start (Docker)

```bash
cp .env.example .env        # optional: edit secrets
docker compose up --build
```

Then open:

- **App:** http://localhost:8080
- **API:** http://localhost:4000 (health: `/health`)

The backend waits for Postgres, applies the schema and seeds demo data on first
run. Sign in with one of the seeded accounts:

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Admin |
| `manager` | `manager123` | Manager |
| `worker` | `worker123` | Worker |

> Change `JWT_SECRET` and the seeded passwords before any real deployment.

## Local development (without Docker)

You need Node 20+ and a running PostgreSQL.

```bash
# Backend
cd backend
npm install
# point at your database via env vars or a .env file, then:
npm run migrate      # create schema + seed
npm run dev          # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev          # http://localhost:5173 (proxies /api to :4000)
```

## Project layout

```
backend/
  src/
    config.js            env-driven config
    db/                  pool, schema.sql, migrate+seed
    middleware/          auth (JWT), roles, error handling
    services/stock.js    the single place stock quantities change
    routes/              auth, users, products, locations, inventory,
                         receiving, shipping, movements, dashboard, reports
frontend/
  src/
    api/                 axios client + useFetch hook
    auth/                auth context
    components/          layout, nav, icons, toasts, shared UI, doc workflow
    pages/               Login, Dashboard, Inventory, Products, Receiving,
                         Shipping, Movements, Scan, Reports, Users
docker-compose.yml       db + backend + frontend
```

## How stock stays correct

All quantity changes flow through one transactional helper
(`backend/src/services/stock.js`). It locks the inventory row, refuses to let a
location go negative, upserts the new quantity and writes a `stock_movements`
row — so the on-hand figure and the audit trail can never drift apart. Posting a
receipt or shipping an order applies every line inside a single transaction.

## Barcode scanning notes

The Scan station accepts input two ways, both feeding the same lookup:

1. **Keyboard-wedge** — warehouse PDA/ring scanners behave like keyboards and
   send `Enter`. The always-focused input captures them with zero configuration.
2. **Camera** — uses the browser's native `BarcodeDetector` API (modern Android
   Chrome). When unsupported, the UI says so and falls back to scanner/manual
   entry.
