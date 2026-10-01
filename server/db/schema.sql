-- TrioCraft Production Marketplace — database schema (PostgreSQL)
--
-- v10: migrated from SQLite (better-sqlite3) to PostgreSQL. Why: the old
-- engine wasn't actually unstable, but better-sqlite3 is a NATIVE module —
-- it needs a prebuilt binary matching the exact Node version, and a very
-- new/non-LTS Node release (e.g. 24.x before prebuilds catch up) breaks it
-- with "Could not locate the bindings file". The `pg` driver used here is
-- pure JavaScript — no native binary, ever — and Postgres also gives proper
-- concurrent-write handling if the API ever runs on more than one server.
-- Translation notes from the old SQLite schema:
--   INTEGER PRIMARY KEY AUTOINCREMENT  -> SERIAL PRIMARY KEY
--   TEXT ... DEFAULT (datetime('now'))  -> TIMESTAMPTZ ... DEFAULT NOW()
--     (every created_at/updated_at/published_at column — the app already
--     reads these with `new Date(...)` everywhere, which parses the
--     ISO-via-JSON value pg/Node produce exactly as it parsed the old
--     SQLite string, so no frontend changes were needed)
--   plain date-string fields (orders.deadline, orders.invoice_due_date) —
--     left as TEXT, unchanged: they're opaque 'YYYY-MM-DD' strings from
--     form input / addDays(), never a datetime('now') default
--   boolean-ish flag columns (vetted, pantone_matched, verified, active,
--     is_default, corporate_verified, etims_simulated) — left as INTEGER
--     0/1, unchanged: the app reads/writes them as 0/1 everywhere, and
--     Postgres INTEGER supports that identically to SQLite
--   CHECK constraints, FOREIGN KEY references, UNIQUE — all supported
--     as-is in Postgres, no syntax changes needed
--
-- v6: 11-division service taxonomy (categories.service_code, the capability
-- statement's A–K letters) and orders.category_id for tagging product-less
-- Custom Brief orders with a Service Category on invoices/job cards.
--
-- v4: enterprise B2B credit/LPO workflow (account types, LPO/invoice fields,
-- KRA e-TIMS fiscal-invoice tracking), EAC multi-currency display (fx_rates)
-- and cross-border delivery, and AI-structured custom briefs. Layered on
-- v3's print-specific pricing engine, pre-press checks, real print-shop
-- order lifecycle, and M-Pesa payments.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('client','vendor','admin')) DEFAULT 'client',
  company TEXT,
  phone TEXT,
  -- ── B2B credit / LPO account fields ──
  account_type TEXT NOT NULL DEFAULT 'retail' CHECK(account_type IN ('retail','corporate')),
  corporate_verified INTEGER DEFAULT 0, -- admin has confirmed this is a legitimate corporate account
  credit_terms_days INTEGER, -- 30/60/90 — set by admin once verified; NULL = not yet extended credit
  kra_pin TEXT, -- for e-TIMS / tax invoice display
  preferred_currency TEXT DEFAULT 'KES', -- display-only, see lib/currency.js
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  service_code TEXT -- v6: the capability-statement letter (A–K) this category maps to —
                     -- see db/seed.js's 11-division taxonomy. Used to tag invoice line
                     -- items and job cards with their Service Category.
);

CREATE TABLE IF NOT EXISTS providers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  vetted INTEGER DEFAULT 1,
  pantone_matched INTEGER DEFAULT 1,
  turnaround_days INTEGER DEFAULT 7,
  location TEXT,
  rating REAL DEFAULT 4.5,
  specialty TEXT, -- e.g. 'Large Format Vinyl', 'Screen Printing', 'Offset Litho' — used for routing suggestions
  notes TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  base_price INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER DEFAULT 1,
  image TEXT,
  active INTEGER DEFAULT 1
);

-- ── Print pricing engine ──────────────────────────────────────────────
-- A product can carry option GROUPS (e.g. "Paper Stock", "Finish", "Size"),
-- each with several VALUES that add a per-unit price delta (e.g. "300gsm
-- Matt" = +150 KES/unit). Quantity tiers give volume-based unit pricing
-- (e.g. 500+ units = 18 KES/unit instead of the 25 KES base). The two
-- compose: effective_unit_price = tier_unit_price_for(quantity) + sum(deltas
-- of selected option values). See lib/pricing.js.

CREATE TABLE IF NOT EXISTS product_options (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_option_values (
  id SERIAL PRIMARY KEY,
  option_id INTEGER NOT NULL REFERENCES product_options(id),
  label TEXT NOT NULL,
  price_delta INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_quantity_tiers (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  min_qty INTEGER NOT NULL,
  max_qty INTEGER, -- NULL = open-ended ("500+")
  unit_price INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS brand_assets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  asset_type TEXT NOT NULL CHECK(asset_type IN ('logo','color_palette','font','guideline','other')),
  label TEXT,
  filename TEXT,
  value TEXT, -- e.g. hex code for color_palette entries without a file
  verified INTEGER DEFAULT 0,
  -- Pre-press metadata, populated at upload time for image files (see lib/preflight.js)
  width_px INTEGER,
  height_px INTEGER,
  likely_color_space TEXT, -- 'RGB' | 'CMYK' | 'Vector/PDF' | 'Unknown'
  preflight_notes TEXT, -- JSON array of warning strings
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  provider_id INTEGER REFERENCES providers(id),
  title TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  quoted_price INTEGER, -- admin's authoritative per-unit quote, once set
  calculated_unit_price INTEGER, -- what the pricing engine computed at cart time (tier + option deltas)
  options_json TEXT, -- JSON array of {option_name, value_label, price_delta} — the configuration the client picked
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN (
    'new', 'quotation', 'approved', 'prepress', 'prepress_approved',
    'in_production', 'quality_check', 'ready_for_dispatch', 'out_for_delivery',
    'completed', 'cancelled'
  )),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','deposit','paid','refunded')),
  progress INTEGER DEFAULT 0,
  deadline TEXT,
  brief TEXT,
  -- Delivery / logistics
  delivery_method TEXT CHECK(delivery_method IN ('pickup','nairobi_rider','upcountry_courier','cross_border_eac') OR delivery_method IS NULL),
  delivery_partner TEXT, -- e.g. 'In-house Rider', 'Sendy', 'Farasi', 'G4S', 'EASY COACH', 'Fargo Courier', 'SpeedAF', 'DHL Express'
  delivery_town TEXT,
  delivery_address TEXT,
  delivery_country TEXT, -- 'UG' | 'TZ' | 'RW' when delivery_method = 'cross_border_eac'; NULL/omitted = Kenya
  cross_border_cost_kes INTEGER, -- estimate from lib/cross-border.js at checkout time
  -- ── B2B credit / LPO workflow ──
  payment_terms TEXT NOT NULL DEFAULT 'due_on_delivery' CHECK(payment_terms IN ('due_on_delivery','net30','net60','net90')),
  lpo_number TEXT,
  lpo_filename TEXT, -- uploaded LPO document, stored alongside brand-vault uploads
  mockup_filename TEXT, -- v5: composited logo-on-product preview from the live canvas mockup editor (public/js/mockup-editor.js), if the client used it
  category_id INTEGER REFERENCES categories(id), -- v6: only set for product-less Custom Brief orders (product_id
                                                   -- IS NULL) — orders tied to a catalogue product derive their
                                                   -- Service Category via products.category_id instead.
  invoice_number TEXT, -- TrioCraft's own invoice/proforma reference, assigned when admin invoices the order
  invoice_due_date TEXT,
  invoice_status TEXT NOT NULL DEFAULT 'not_invoiced' CHECK(invoice_status IN ('not_invoiced','invoiced','overdue','paid')),
  -- ── KRA e-TIMS fiscal receipt (see lib/etims.js) ──
  etims_invoice_number TEXT,
  etims_status TEXT NOT NULL DEFAULT 'not_issued' CHECK(etims_status IN ('not_issued','issued','failed')),
  etims_control_number TEXT, -- v5: simulated control unit number, or the real one once ETIMS_API_URL/KEY are set
  etims_simulated INTEGER NOT NULL DEFAULT 1, -- v5: 1 = simulated fiscal receipt (no real KRA credentials configured), 0 = real
  etims_qr_data_url TEXT, -- v5: the QR PNG (data: URL) generated at issuance time, stored so every PDF download renders the identical code
  -- ── Multi-currency display + AI-structured brief ──
  currency TEXT NOT NULL DEFAULT 'KES', -- the currency the client was viewing prices in at order time (display only — KES is authoritative)
  ai_brief_json TEXT, -- structured output from lib/ai-brief.js, if the client used "AI Assist" on the Custom Brief form
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_timeline (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  stage TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Payments (M-Pesa Daraja STK Push, MTN MoMo, Airtel Money) ─────────
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  method TEXT NOT NULL DEFAULT 'mpesa' CHECK(method IN ('mpesa','momo','airtel_money','cash','bank','other')),
  phone TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES', -- 'KES' for M-Pesa, 'UGX'/'TZS'/'RWF' for regional mobile money
  provider_ref TEXT, -- Daraja CheckoutRequestID / MoMo referenceId / Airtel transactionId
  merchant_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','failed','cancelled')),
  result_desc TEXT,
  mpesa_receipt TEXT,
  raw_callback TEXT, -- JSON dump of the provider callback for troubleshooting
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── FX rates for multi-currency display (see lib/currency.js) ────────
-- kes_per_unit = how many KES one unit of currency_code is worth. Seeded
-- with illustrative starting values in db/seed.js — NOT a live feed; update
-- periodically from a source your finance team trusts.
CREATE TABLE IF NOT EXISTS fx_rates (
  currency_code TEXT PRIMARY KEY,
  kes_per_unit REAL NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  eyebrow TEXT DEFAULT 'Resources',
  excerpt TEXT,
  body_html TEXT NOT NULL,
  meta_description TEXT,
  read_minutes INTEGER DEFAULT 5,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
