# Trading Checklist & Trade Journal

A professional, dark-mode trading journal: a dynamic pre-trade checklist that can
block undisciplined entries, a full trade-entry and post-trade journaling flow,
screenshot management, automatic scoring, a rule-based AI review, and an
analytics dashboard with equity curve, monthly performance and a P/L calendar.

This app lives alongside the existing WMS in this repo, in two self-contained
folders:

```
server/   Node.js + Express + PostgreSQL API (JWT auth)
web/      React + Vite SPA (Recharts charts, dark theme)
```

> Stack note: the prompt asked for React+TypeScript. To stay consistent with
> this repository's existing JavaScript/JSX monorepo (and ship a single coherent,
> runnable codebase) the app is written in modern ES-module JavaScript/JSX. The
> architecture maps 1:1 to a TS port if desired.

## Features

| Area | What's built |
|------|--------------|
| **Dynamic checklist** | Add/edit/delete checkpoints with weight + required flag; weighted completion %; required items **block** opening a trade (enforced server-side, 422). |
| **Trade entry** | Date/time, instrument, buy/sell, entry/SL/TP, risk %, balance, lot size, session, setup type, market condition, tags. |
| **Images** | Multi-upload per trade grouped into Before / During / After, each with title, comment, timestamp; click-to-zoom lightbox. |
| **Journal** | Result (win/loss/BE), P/L in $ and %, emotions before/during/after, what went well/wrong, improvements. |
| **Auto analysis** | Discipline / execution / risk-management / overall scores, planned R:R, weekly & monthly stats, most-frequent-mistake counts. |
| **Dashboard** | Total trades, win rate, average R:R, total profit, equity curve, monthly performance bars, calendar heat view. |
| **AI review** | Deterministic, explainable feedback per trade: what went well, key mistakes, suggestions, planned-vs-impulsive verdict. (Swap in an LLM in `server/src/services/analysis.js`.) |
| **Export** | CSV export of all trades. |
| **Bonus** | Tags, search & filtering, risk calculator, R:R calculator, daily plans, weekly & monthly reviews, market-condition tracker, psychology fields. |

## Run locally

**Requirements:** Node 20+, PostgreSQL 14+.

```bash
# 1. Database (or use docker compose -f docker-compose.journal.yml up journal-db)
createdb journal

# 2. Backend
cd server
cp .env.example .env          # adjust POSTGRES_* / JWT_SECRET
npm install
npm run dev                   # migrates + seeds, listens on :4100

# 3. Frontend
cd ../web
npm install
npm run dev                   # Vite on :5174, proxies /api -> :4100
```

Open http://localhost:5174 and sign in with the seeded demo account:

```
demo@journal.app / demo1234
```

### Docker

```bash
docker compose -f docker-compose.journal.yml up --build
# API + Postgres come up; run the web dev server (or build web/ and serve dist/).
```

## API overview

```
POST   /api/auth/register | /login        GET /api/auth/me
GET/POST/PUT/DELETE /api/checklist[/:id]
POST   /api/trades                         (creates + snapshots checklist, scores, reviews)
GET    /api/trades?q=&result=&session=&status=&from=&to=
GET/PUT/DELETE /api/trades/:id             PUT /api/trades/:id/checklist
POST   /api/images/trade/:tradeId          DELETE /api/images/:id
GET    /api/analytics/dashboard            GET /api/export/csv
GET/PUT /api/notes                         (daily plan / weekly / monthly review)
```

## Scoring model

`server/src/services/analysis.js` is pure and deterministic:

- **Discipline** — weighted checklist adherence, penalised for impulsive language
  (FOMO/revenge/…) detected in the emotion fields.
- **Execution** — rewards healthy planned R:R, penalises missing stop/target.
- **Risk** — position risk % within a sane band; a missing stop caps the score.
- **Overall** — `0.4·discipline + 0.3·execution + 0.3·risk`.

Scores and the AI review are recomputed every time a trade or its journal is saved.
