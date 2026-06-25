-- Trading Checklist & Trade Journal schema.
-- Safe to run repeatedly: every object uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reusable checklist questions/checkpoints the trader maintains. Each item has
-- an optional weight (importance) and a `required` flag: a trade may not be
-- opened unless every required item is checked.
CREATE TABLE IF NOT EXISTS checklist_items (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  weight     INTEGER NOT NULL DEFAULT 1,
  required   BOOLEAN NOT NULL DEFAULT FALSE,
  position   INTEGER NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checklist_user ON checklist_items (user_id);

-- A trade groups the pre-trade entry data, the post-trade journal, the
-- checklist snapshot, computed scores and any attached screenshots.
CREATE TABLE IF NOT EXISTS trades (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,

  -- Entry form
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  instrument      TEXT NOT NULL,
  direction       TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  entry_price     NUMERIC,
  stop_loss       NUMERIC,
  take_profit     NUMERIC,
  risk_pct        NUMERIC,
  account_balance NUMERIC,
  lot_size        NUMERIC,
  session         TEXT CHECK (session IN ('asian', 'london', 'newyork', 'other')),
  setup_type      TEXT,
  market_condition TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',

  -- Journal (post-trade)
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  result          TEXT CHECK (result IN ('win', 'loss', 'be')),
  profit_amount   NUMERIC,
  profit_pct      NUMERIC,
  closed_at       TIMESTAMPTZ,
  emotions_before TEXT,
  emotions_during TEXT,
  emotions_after  TEXT,
  what_went_well  TEXT,
  what_went_wrong TEXT,
  improvements    TEXT,

  -- Auto-analysis (computed on save)
  checklist_pct     NUMERIC NOT NULL DEFAULT 0,
  discipline_score  NUMERIC,
  execution_score   NUMERIC,
  risk_score        NUMERIC,
  overall_score     NUMERIC,
  planned_rr        NUMERIC,

  -- AI review (generated)
  ai_review       JSONB,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trades_user ON trades (user_id);
CREATE INDEX IF NOT EXISTS idx_trades_opened ON trades (opened_at);

-- Per-trade snapshot of the checklist as it stood when the trade was opened.
-- Snapshotting the text/weight keeps historical trades accurate even if the
-- trader later edits or deletes the template item.
CREATE TABLE IF NOT EXISTS trade_checklist (
  id        SERIAL PRIMARY KEY,
  trade_id  INTEGER NOT NULL REFERENCES trades (id) ON DELETE CASCADE,
  item_id   INTEGER REFERENCES checklist_items (id) ON DELETE SET NULL,
  text      TEXT NOT NULL,
  weight    INTEGER NOT NULL DEFAULT 1,
  required  BOOLEAN NOT NULL DEFAULT FALSE,
  checked   BOOLEAN NOT NULL DEFAULT FALSE,
  comment   TEXT
);
CREATE INDEX IF NOT EXISTS idx_trade_checklist_trade ON trade_checklist (trade_id);

-- Screenshots grouped by lifecycle stage.
CREATE TABLE IF NOT EXISTS trade_images (
  id          SERIAL PRIMARY KEY,
  trade_id    INTEGER NOT NULL REFERENCES trades (id) ON DELETE CASCADE,
  category    TEXT NOT NULL CHECK (category IN ('before', 'during', 'after')),
  title       TEXT,
  comment     TEXT,
  url         TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trade_images_trade ON trade_images (trade_id);

-- Free-form daily/weekly/monthly planning & review notes.
CREATE TABLE IF NOT EXISTS notes (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('daily_plan', 'weekly_review', 'monthly_review')),
  note_date  DATE NOT NULL,
  content    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, note_date)
);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes (user_id);
