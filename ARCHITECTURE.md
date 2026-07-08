# Stockhaus WMS — Architecture

This document captures the requirements analysis and architectural decisions for the
rebuild of Stockhaus onto the target production stack. It is written before the
corresponding code so every module that follows has a place to sit.

## 1. Requirements analysis (summary)

The system serves three concurrent surfaces against one API/database:

- **PDA (handheld scanner)** — barcode-first, large touch targets, must tolerate
  spotty warehouse Wi-Fi (offline queue + sync), works with keyboard-wedge hardware
  scanners (Zebra/Honeywell) and phone cameras.
- **Web Admin Panel** — desktop-oriented CRUD, reporting, configuration, RBAC
  management.
- **REST API** — the single source of truth both surfaces call; documented with
  OpenAPI/Swagger.

Cross-cutting requirements: 7 configurable roles, full audit trail on every stock
mutation, soft deletes on master data, multi-warehouse + full location hierarchy
(Warehouse → Zone → Area → Aisle → Rack → Shelf → Bin), batch/serial/expiry
tracking, and export to CSV/Excel/PDF.

The functional surface (receiving, putaway, transfer, picking, packing,
controlling) is really one pattern repeated: **a document with line items that,
when confirmed, mutates stock through one transactional stock ledger and leaves
an immutable movement record.** Getting that ledger right is the highest-leverage
piece of the whole system — every module is a different way of proposing a change
to it.

## 2. Architecture decisions

### 2.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | Node 20, Express, **TypeScript** | Explicit contracts between layers; catches the "which module owns this field" mistakes that are expensive in a system this wide. |
| ORM | **Prisma** | Schema-as-code doubles as the ER diagram; migrations are generated, not hand-written; typed client removes a whole class of query bugs. |
| Validation | **Zod** | One schema per DTO, shared shape between "validate the request" and "type the handler." |
| Auth | JWT access token (short-lived) + rotating refresh token (httpOnly cookie, stored hashed in DB so it can be revoked) | Stateless verification for the access token, revocable session for the refresh token — needed because PDA sessions must survive a shift without asking operators to re-key credentials. |
| Frontend | React + TypeScript + Vite | Fast dev loop, native ESM, no framework lock-in for a two-surface (admin + PDA) app. |
| UI kit | Tailwind + shadcn/ui | Unstyled primitives we own the source of (no black-box component library to fight when the PDA needs 64px touch targets and the admin panel needs a dense data table from the same primitives). |
| Server state | React Query | Warehouse screens are read-heavy and revalidate constantly (stock counts, task queues); React Query's cache invalidation model fits better than hand-rolled fetch/state. |
| Client routing | React Router | Two route trees (`/admin/*`, `/pda/*`) sharing one auth/session layer. |
| DB | PostgreSQL | Transactional integrity for the stock ledger, relational shape fits the domain (it *is* a graph of foreign keys), mature partial-index/constraint support. |
| Packaging | Docker Compose (dev + prod), Caddy (prod TLS/reverse proxy) | Already proven in this repo; kept as-is. |

### 2.2 Clean architecture / module layout

Each backend module is a vertical slice, not a horizontal layer:

```
backend/src/modules/<module>/
  <module>.routes.ts       Express router — wires HTTP verbs to controller methods
  <module>.controller.ts   Parses req, calls service, shapes res. No business logic.
  <module>.service.ts      Business logic + transactions. Talks to repositories, never to req/res.
  <module>.repository.ts   Prisma queries only. No business logic.
  <module>.schema.ts       Zod DTOs for request validation + inferred TS types
```

Rule: **dependencies point inward** (routes → controller → service → repository →
Prisma). A service never imports another module's repository directly — if
Receiving needs to touch stock, it calls `inventoryService.applyMovement(...)`,
the one seam every stock-mutating module shares. This is what keeps "who changed
this quantity and why" auditable without every module reimplementing it.

Cross-cutting concerns (auth, RBAC, validation, error shaping, rate limiting) are
Express middleware in `src/middleware/`, applied at the route-registration layer
(`src/routes/index.ts`), not duplicated per module.

### 2.3 RBAC model

Roles are seed data, not an enum — `Role` and `Permission` are tables, `RolePermission`
is the join. The 7 requested roles (Admin, Warehouse Manager, Supervisor, Warehouse
Operator, Picker, Controller, Viewer) are seeded with a sensible default permission
set, but an Admin can regrant permissions per role at runtime through the Roles &
Permissions screens — satisfying "every role must have configurable permissions"
without a redeploy. Permissions are namespaced strings (`receiving:create`,
`inventory:adjust`, `users:manage`) checked by one `requirePermission()` middleware
against the caller's JWT-embedded permission set (refreshed on login/refresh-token
rotation, so a permission change takes effect on the user's next token refresh).

### 2.4 Stock ledger (the seam everything else depends on)

One service (`inventoryService`), one Prisma transaction per mutation:

1. Row-lock the `InventoryItem` (warehouse × location × product × batch × serial).
2. Validate the movement won't take on-hand negative (unless it's an adjustment
   explicitly allowed to).
3. Upsert the new quantity split (available/reserved/blocked/damaged/expired).
4. Insert one `StockMovement` row: who, when, from-location, to-location,
   document type + id, reason, quantity delta.

Receiving, Put Away, Transfer, Picking, Packing, and Controlling all call this
service instead of writing to `InventoryItem` themselves — that's what keeps the
audit trail and the on-hand figures from ever drifting apart, the same guarantee
the current Stockhaus MVP already leans on, carried forward into the typed
version.

### 2.5 Location hierarchy

Locations are a single self-referencing table (`Location.parentId`) typed by
`LocationType` enum (WAREHOUSE, ZONE, AREA, AISLE, RACK, SHELF, BIN) rather than
six separate tables — the hierarchy depth is a warehouse-configuration detail, not
a schema-level constant, and every level shares the same fields (code, barcode,
capacity, status).

### 2.6 Offline PDA

PDA scan actions (putaway confirm, pick confirm, pack confirm, transfer confirm)
write to an IndexedDB outbox first; a sync worker drains the outbox against the
API when `navigator.onLine` and replays on reconnect. Read data the PDA needs
offline (assigned tasks, product/location lookups) is cached via the same
mechanism through a service worker (PWA), so a dead zone in the warehouse doesn't
block scanning — only confirmation sync waits for connectivity.

### 2.7 Folder structure

```
backend/
  prisma/
    schema.prisma
    seed.ts
  src/
    config/            env parsing
    lib/                prisma client, logger
    core/               AppError hierarchy, pagination helpers
    middleware/         auth, rbac, validate, error, rate-limit
    modules/            one folder per domain module (see 2.2)
    routes/             route aggregation + swagger
    app.ts / server.ts

frontend/
  src/
    app/                router root, providers (QueryClient, Auth, Theme)
    features/           one folder per domain module: api hooks, components, pages
    components/ui/      shadcn primitives
    components/shared/  cross-feature composites (DataTable, BarcodeInput, StatusBadge)
    lib/                axios client, query client, utils
    admin/              admin route tree + layout
    pda/                PDA route tree + layout + offline outbox
```

## 3. Migration note

The existing plain-JS Stockhaus MVP (Express + raw `pg`, 3 roles) is being
replaced in place on this branch per product decision — it proved the domain
model (one stock ledger, append-only movements) but not the tech stack or role
model requested. Its `schema.sql` is the starting point for the Prisma schema,
extended with the modules it didn't have (putaway, transfers, picking, packing,
controlling, full location hierarchy, batch/serial tracking).
