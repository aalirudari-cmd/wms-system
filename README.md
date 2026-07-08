# Stockhaus — Warehouse Management System

A production-oriented, full-stack WMS covering the whole warehouse lifecycle —
goods receiving, put-away, internal transfers, picking, packing and stock
control — built for three surfaces at once: a handheld **PDA scanner** app, a
desktop **web admin panel**, and the **REST API** they both share.

```
React + Vite + TS      ──/api──►   Node + Express + TS   ──►  PostgreSQL
(admin panel + PWA PDA)             (REST, JWT, RBAC)          (Prisma ORM)
```

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the design decisions behind the
schema, the single stock-ledger seam, the RBAC model and the offline PDA
strategy.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, shadcn-style UI (Radix), React Query, React Router, PWA |
| Backend | Node 20, Express, TypeScript, Zod validation, Swagger (OpenAPI) |
| Database | PostgreSQL 16, Prisma ORM (migrations + typed client) |
| Auth | JWT access tokens + rotating refresh tokens (httpOnly cookie, revocable) |
| Infra | Docker Compose (dev + prod), Caddy (prod TLS/reverse proxy) |

## Modules

Goods Receiving (PO / ASN / no-PO, status workflow) · Put Away (suggested
locations, capacity + mixed-SKU validation) · Internal Transfer (approval
workflow) · Picking (single / multi / wave, exceptions) · Packing · Controlling
(cycle counts with approval) · Inventory (available / reserved / blocked /
damaged, batch + serial) · Stock Movement history · Warehouse Locations
(Warehouse → Zone → Area → Aisle → Rack → Shelf → Bin) · Master Data (products,
suppliers, customers, warehouses, units, categories, brands) · Reports (CSV
export) · Dashboard (real-time KPIs, throughput, live activity).

## Roles (RBAC)

Seven seeded roles — **Admin, Warehouse Manager, Supervisor, Warehouse Operator,
Picker, Controller, Viewer** — each a configurable set of namespaced permissions
(`receiving:create`, `inventory:adjust`, …). An Admin can regrant any role's
permissions at runtime from the Roles & Permissions screen; the change takes
effect on the user's next token refresh. No redeploy needed.

## Quick start (Docker)

```bash
cp .env.example .env        # edit secrets before any real deployment
docker compose up --build
```

Then open:

- **App:** http://localhost:8080
- **API:** http://localhost:4000 (health: `/health`)
- **API docs (Swagger):** http://localhost:4000/api-docs

The backend waits for Postgres, runs Prisma migrations and seeds reference data
(permissions, roles, admin user, and demo data when `SEED_DEMO=true`). Sign in
with a seeded account:

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Admin |
| `manager` | `manager123` | Warehouse Manager |
| `operator` | `operator123` | Warehouse Operator |
| `picker` | `picker123` | Picker |
| `controller` | `controller123` | Controller |

> Change the JWT secrets and seeded passwords before deploying. Set
> `SEED_DEMO=false` in production so only the admin account is created.

The PDA scanner interface lives at **`/pda`** (installable as a PWA). It's
barcode-first with large touch targets, keyboard-wedge hardware-scanner support
(Zebra/Honeywell), camera scanning where available, light/dark mode, and an
offline outbox that queues scan confirmations and syncs on reconnect.

## Local development (without Docker)

Requires Node 20+ and a running PostgreSQL.

```bash
# Backend
cd backend
npm install
cp ../.env.example .env       # point DATABASE_URL at your Postgres
npx prisma migrate deploy     # create schema
npm run seed                  # permissions, roles, admin + demo data
npm run dev                   # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxies /api to :4000)
```

## Project layout

```
backend/
  prisma/
    schema.prisma        the data model (doubles as the ER diagram)
    migrations/          generated SQL migrations
    seed.ts              permissions, roles, admin, demo data
  src/
    config/ lib/ core/   env, prisma client, errors, pagination, permissions
    middleware/          auth (JWT), rbac (permissions), validate (Zod), rate-limit, errors
    modules/<domain>/    routes → controller → service → repository per module
    routes/              route aggregation + swagger
    app.ts / server.ts
frontend/
  src/
    lib/ auth/ app/      axios client, query client, auth context, router, nav
    components/ui/        shadcn-style primitives (button, dialog, table, …)
    components/shared/    DataTable bits, BarcodeScanInput, StatusBadge, theme
    features/<domain>/    admin pages (dashboard, inventory, receiving, …)
    admin/                admin layout (sidebar, RBAC-aware nav)
    pda/                  PDA layout + scan workflows + offline outbox
docker-compose.yml        db + backend + frontend (dev)
docker-compose.prod.yml   + Caddy (TLS/reverse proxy)
```

## How stock stays correct

Every quantity change in the system — receiving, put-away, transfer, picking,
cycle-count correction — flows through one transactional ledger
(`backend/src/modules/inventory/ledger.service.ts`). It row-locks the source
inventory row, refuses to take a location negative, updates the on-hand split
(available / reserved / blocked / damaged) and writes one immutable
`StockMovement` row in the same transaction. On-hand figures and the audit trail
can never drift apart. See ARCHITECTURE.md §2.4.
