# TrioCraft Brands Ltd — Website & Production Marketplace

A complete, ready-to-deploy Node.js website for TrioCraft: public marketing
pages, a Resources/Blog section (seeded with the "Production Marketplace"
guide), and a full working Production Marketplace — catalogue browsing with
a real print-pricing engine, Brand Vault with automatic pre-press checks,
cart/checkout with M-Pesa payment and local delivery logistics, and order
tracking through a genuine print-shop production lifecycle (**quotation →
approval → pre-press → production → quality check → dispatch → delivery**)
— with separate client, vendor, and admin dashboards.

It's a real backend (Express + SQLite), not a mockup: every action (placing
an order, uploading a brand asset, moving an order through production)
writes to a database and is reflected immediately for every role that can
see it.

## Stack

- **Express** — server & routing
- **EJS** — server-rendered views (no build step, no bundler — just Node)
- **better-sqlite3** — file-based database, zero setup, no separate DB server needed
- **express-session** + **connect-sqlite3** — login sessions persisted to disk
- **bcryptjs** — password hashing
- **multer** — Brand Vault file uploads
- **image-size** — reads uploaded artwork dimensions for the pre-flight
  resolution check (`lib/preflight.js`)
- Node's built-in `fetch` (Node 18+) — used for M-Pesa Daraja HTTP calls, no
  extra HTTP client dependency needed

Because it's zero-build, this runs on almost any Node host as-is: a VPS,
Render, Railway, Fly.io, a shared Node/Passenger host, etc.

## Project layout

```
server.js              → app entry point, wires everything together
db/schema.sql           → table definitions (SQLite)
db/seed.js              → populates categories, providers, products (with
                          pricing-engine demo data), demo logins, and the
                          Production Marketplace blog post
lib/pricing.js           → option-group + quantity-tier price computation
lib/preflight.js         → artwork resolution / colour-space / bleed checks
lib/mpesa.js             → Daraja 2.0 STK Push (graceful-degrades if unset)
lib/delivery.js          → local delivery method + partner definitions
lib/mailer.js            → nodemailer wrapper (graceful-degrades if unset)
lib/guest.js             → guest checkout → soft client-account creation
lib/site-config.js       → real contact details used across public pages
routes/                 → auth, marketing (home/services/contact),
                          resources (blog), marketplace (client-facing,
                          pricing + delivery), payments (M-Pesa), admin,
                          vendor (production routing)
middleware/auth.js       → session + role-gating helpers
views/                  → EJS templates (public site + 3 dashboards)
public/css/styles.css    → the whole design system (CSS variables at the top)
uploads/brand-vault/     → client-uploaded brand assets land here at runtime
```

## Design system

Everything is driven by CSS variables at the top of `public/css/styles.css`
— ink navy, rust, gold, forest, cream, Cormorant Garamond (display) + DM Sans
(body). Change the variables once and the whole site restyles. **I built
this against the Production Marketplace app's existing design tokens since I
could not reach the live triocraft.org to confirm its current styling —
check these against your actual site and adjust if they've since diverged.**

## Local setup

```bash
npm install
cp .env.example .env        # then edit SESSION_SECRET at minimum
npm run seed                 # creates db/triocraft.sqlite and populates it
npm start                    # → http://localhost:3000
```

`npm run dev` uses `node --watch` for auto-restart while you edit.

### Demo logins (created by the seed script)

| Role   | Email                    | Password       |
|--------|--------------------------|----------------|
| Admin      | admin@triocraft.org      | ChangeMe!2026  |
| Vendor     | vendor@triocraft.org     | ChangeMe!2026  |
| Client     | client@triocraft.org     | ChangeMe!2026  |
| Corporate  | corporate@triocraft.org  | ChangeMe!2026  |

**Change these passwords (or delete the demo accounts) before going live.**
The vendor demo account is linked to "Stitchline Ltd" — a vendor's dashboard
shows only orders assigned to the provider matching their `company` field.
The corporate demo account ("Acme Distributors Ltd") is pre-verified with
Net 30 credit terms and a KRA PIN on file — see v4 below for what that
unlocks at checkout.

## v2 — Information Architecture refresh

This build layers in a full IA/positioning refresh on top of the original
Production Marketplace backend: **"Transforming physical spaces into
immersive brand experiences."** What changed:

- **Nav & footer**: `Work · Services · Marketplace · Resources · Contact`
  (was: Home · Services · Production Marketplace · Resources · Contact).
  Footer service links now match the outcome-grouped Services page.
- **`/work`** — new portfolio page with client-side category filtering
  (Office & Corporate, Events & Exhibitions, Apparel & Merchandise,
  Vehicle & Outdoor). Backed by `data/projects.js` — a static array by
  design (see the comment at the top of that file for the migration path
  to a real `projects` table once you have photography and want it
  admin-editable).
- **Homepage rewrite** — outcome-led hero with dual CTAs, a featured-work
  strip pulling from `data/projects.js`, services overview, how-it-works,
  a trust bar with testimonials (static in `routes/marketing.js` — swap for
  real quotes as you collect them), resources teaser, final CTA.
- **`/services` regrouped** into five outcome-based sections (Office &
  Corporate Spaces, Events & Exhibitions, Apparel & Merchandise, Vehicle &
  Outdoor Branding, Print/Packaging & Custom) instead of a flat category
  grid — mapping lived in `SERVICE_GROUPS` in `routes/marketing.js`.
  **Superseded in v6**: `/services` is now the formal Capability Statement
  with all 11 lettered divisions as expandable cards — see the v6 section
  below. `SERVICE_GROUPS` no longer exists in `routes/marketing.js`.
- **`/about`** — new page with the company story and values, pulled from
  the brand knowledge transfer doc.
- **Contact page upgrade** — real phone (click-to-call), WhatsApp button,
  physical address, an embedded Google Map, and office hours, pulled from
  TrioCraft's own invoice letterhead (`lib/site-config.js` — update there if
  any of these details change). **Email notifications are now wired**: the
  contact form and every new order/custom-brief send a notification to
  `triocraft.brands@gmail.com` via `lib/mailer.js` — see "Turning on real
  email" below.
- **Sticky WhatsApp float** (`views/partials/whatsapp-float.ejs`) on every
  public page.
- **Open Graph / Twitter Card meta tags** in `views/partials/head.ejs`,
  with a placeholder branded `og:image` at `public/img/og-default.svg` —
  swap for a real photo/PNG once you have one (some crawlers don't render
  SVG `og:image` reliably).
- **Public marketplace, softened**: `/marketplace` and
  `/marketplace/product/:slug` now render a light public layout (site
  header/footer) for guests and only switch to the full dashboard shell
  once someone is logged in. `/marketplace/custom-brief` and
  `/marketplace/cart` → checkout no longer require an account — a guest who
  submits a brief or checks out is transparently "soft-registered"
  (`lib/guest.js`: an account is created from their name/email and they're
  logged in automatically) so the order has an owner and they land
  straight on their own order tracking. They can set a real password later
  via `/register` with the same email.
- **Placeholder `/privacy` and `/terms`** so the new footer links don't
  404 — replace the copy in `views/legal.ejs` with your reviewed policy
  before relying on it.

### Turning on real email

`lib/mailer.js` sends via `nodemailer` if `SMTP_HOST` / `SMTP_USER` /
`SMTP_PASS` are set in `.env`; otherwise it logs the would-be email to the
console so nothing crashes and nothing silently vanishes. To go live:

1. Get SMTP credentials — a Gmail **App Password** works for low volume
   (Google Account → Security → App Passwords, not your normal password),
   or use SendGrid/Mailgun/your host's SMTP relay for anything higher-volume.
2. Fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   in `.env`.
3. That's it — no code changes. Contact form submissions and every new
   order/custom-brief will start emailing `NOTIFY_EMAIL`
   (`triocraft.brands@gmail.com` by default — change it in `.env`).

## v3 — Print pricing engine, M-Pesa payments, delivery logistics & production routing

This build layers real print-shop mechanics on top of the marketplace:

- **Variable pricing engine** (`lib/pricing.js`, `db/schema.sql`'s
  `product_options` / `product_option_values` / `product_quantity_tiers`
  tables). Any product can carry option groups (e.g. Paper Stock, Finishing,
  Size), each with values that add a per-unit price delta, plus quantity
  tiers for volume discounting (e.g. 500+ units drops the unit price). The
  two compose: `effective_unit_price = tier_price_for(quantity) +
  sum(selected option deltas)`. The product page
  (`views/partials/product-body.ejs`) renders a configurator with a live
  client-side price estimate — but **the server always recomputes the price
  from the database on submit** (`computeOrderPricing` in
  `lib/pricing.js`), so a client can't forge a discount by posting an
  arbitrary price. Manage option groups, values, and tiers per-product from
  `/admin/catalogue`. Three demo products (mug, polo shirt, business card)
  ship pre-seeded with real option groups and tiers — see `db/seed.js`.
- **Artwork pre-flight checks** (`lib/preflight.js`). Every Brand Vault
  upload is checked automatically: likely colour space (flags RGB files —
  screen colours — vs. vector/PDF which is assumed print-ready), image
  resolution against a 300 DPI / 1500px-long-edge threshold using the
  `image-size` package, and a standing 3mm bleed/safe-margin reminder.
  Results are stored on the `brand_assets` row and shown under each file in
  `/marketplace/brand-vault`. This is a fast first-pass warning system, not
  a full RIP — it can't verify bleed from the file alone since that needs
  the trim size, and colour-space detection is a heuristic by file
  extension, not real ICC profile parsing.
- **M-Pesa Daraja 2.0 STK Push** (`lib/mpesa.js`, `routes/payments.js`, the
  `payments` table). A client can trigger a payment prompt straight from
  their order page once a price exists; TrioCraft's admin sees every
  attempt and its outcome on the order too. See "Turning on real M-Pesa
  payments" below — without credentials it simulates the push and logs to
  the console so the flow is fully testable before you have Daraja access.
- **Local delivery/logistics options** (`lib/delivery.js`). Every checkout,
  custom brief, and order carries a delivery method — pickup at TrioCraft's
  Koinange Street office, Nairobi metro rider/boda dispatch (in-house rider,
  Sendy, or Farasi), or upcountry parcel bus/courier (EASY COACH, Fargo
  Courier, SpeedAF, G4S) — plus a partner, town, and address. Admin can
  reassign the method/partner from the order page.
- **Real print-shop order lifecycle & multi-vendor production routing**. The
  old generic e-commerce statuses are gone; `orders.status` now moves
  through `new → quotation → approved → prepress → prepress_approved →
  in_production → quality_check → ready_for_dispatch → out_for_delivery →
  completed` (or `cancelled` at any point) — see the `CHECK` constraint in
  `db/schema.sql`. Admin owns the front half (quoting, approval, assigning a
  production partner); the assigned vendor advances their own segment
  (`prepress → prepress_approved → in_production → quality_check →
  ready_for_dispatch → out_for_delivery`) from `/vendor`, one stage at a
  time, with a note logged to the shared timeline at every step. Providers
  now carry a `specialty` (e.g. "Screen Printing & Embroidery", "Offset
  Litho & Digital Print") shown on the product page and in admin's provider
  picker, so routing a job to the right partner is a visible decision, not
  a guess.

  ⚠️ **This status set is not backward-compatible with v2** (`deposit_paid`,
  `design`, `production`, `delivery` no longer exist as values). SQLite
  can't alter a `CHECK` constraint in place, so upgrading an existing
  install means: back up, delete `db/*.sqlite`, then `npm run seed` again
  against the new schema.

### Turning on real M-Pesa payments

`lib/mpesa.js` calls Safaricom's Daraja 2.0 STK Push API if
`MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` / `MPESA_SHORTCODE` /
`MPESA_PASSKEY` are set in `.env`; otherwise it logs a simulated push to the
console and returns a success-shaped response, so the whole payment flow
(button → prompt → payments table row → timeline entry) is testable without
credentials. To go live:

1. Register on the [Safaricom Daraja portal](https://developer.safaricom.co.ke)
   and create an app to get a consumer key/secret.
2. For production, apply for a **Paybill/Till shortcode** and passkey (the
   sandbox ships a shared test shortcode `174379` for development).
3. Fill in `MPESA_ENV` (`sandbox` or `production`), `MPESA_CONSUMER_KEY`,
   `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, and
   `MPESA_CALLBACK_URL` (a **publicly reachable HTTPS URL** pointing at
   `/api/mpesa/callback` on your deployed server — Safaricom calls this
   webhook to confirm payment, so it must be internet-reachable, not
   `localhost`) in `.env`.
4. That's it — no code changes. `routes/payments.js` picks up the real
   credentials automatically and starts sending genuine STK pushes; the
   callback route updates the `payments` row and the order's
   `payment_status` the moment Safaricom confirms.

## v4 — WhatsApp, B2B credit/LPO, EAC multi-currency & AI-assisted briefs

This build layers four requested feature areas on top of v3, each following
the same graceful-degradation contract as `lib/mpesa.js` and `lib/mailer.js`:
without real credentials, the feature simulates and logs to the console
instead of failing, so every flow is fully testable end to end before you
have live API access; once you add the real keys, the exact same code path
starts doing the real thing with zero further changes.

- **WhatsApp deep-linking + automated status notifications**
  (`lib/whatsapp.js`). Two independent things live here:
  - **Deep-link buttons** (`wa.me/<number>?text=...`) need no API or
    credentials at all — they open WhatsApp with a pre-filled message. These
    appear on the cart, the custom brief form, and every order page, so a
    client can message TrioCraft directly about their cart, brief, or an
    existing order. The number defaults to TrioCraft's WhatsApp Business
    line (`254111206420` — the "0111 206 420" line from the invoice
    letterhead in `lib/site-config.js`); override it with `WHATSAPP_NUMBER`
    in `.env`.
  - **Automated outbound status updates** (order status changes, invoices
    issued, payments confirmed) go through the Meta WhatsApp Cloud API and
    *do* need credentials — set `WHATSAPP_CLOUD_TOKEN` and
    `WHATSAPP_PHONE_NUMBER_ID` in `.env` (get these from
    [developers.facebook.com/docs/whatsapp/cloud-api/get-started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)).
    Without them, `sendStatusUpdate()` logs the message it would have sent
    (see `/admin/orders/:id/update`, `/vendor/orders/:id/advance`, and the
    M-Pesa callback in `routes/payments.js`) and returns success so the
    calling route's flow isn't interrupted.
- **Enterprise B2B credit & LPO workflow** (`users.account_type` /
  `corporate_verified` / `credit_terms_days`, `orders.payment_terms` /
  `lpo_number` / `lpo_filename`, `routes/marketplace.js`,
  `lib/invoice-pdf.js`, `lib/etims.js`). A corporate account that an admin
  has verified (`/admin/clients`) and given credit terms (Net 30/60/90) sees
  a payment-terms selector at checkout in place of "pay now" — choosing a
  Net term requires uploading an LPO document (stored under
  `uploads/lpo/`), which is gated server-side in
  `readCreditFields()`: an unverified account, or a guest, can't self-declare
  credit terms no matter what the form posts. Admin then issues a real
  invoice from the order page (`POST /admin/orders/:id/invoice`), which:
  1. Generates an invoice number and a due date (`created + credit_terms_days`).
  2. Renders a real, downloadable PDF — proforma before invoicing,
     tax invoice after (`lib/invoice-pdf.js`, using `pdfkit`; company
     header, bill-to block with KRA PIN, line items, terms, LPO reference).
  3. Attempts KRA e-TIMS fiscal registration (`lib/etims.js`) — **this one
     is not a drop-in like the others**: unlike Daraja, e-TIMS has no single
     public sandbox API; it requires a KRA-approved VSCU/OSCU middleware
     provider. Without `ETIMS_API_URL` / `ETIMS_API_KEY` set, it simulates a
     fiscal invoice number so the rest of the invoicing workflow (PDF, due
     date, notifications) is fully testable; point those two env vars at
     your middleware provider's endpoint once you're onboarded with one.
  4. Sends an email + WhatsApp notification that the invoice was issued.
- **EAC multi-currency display layer** (`lib/currency.js`, the `fx_rates`
  table, `/admin/fx-rates`). **KES remains the one authoritative
  transaction currency everywhere** — pricing, orders, and M-Pesa payments
  are untouched. This layer only adds a session-level currency switcher
  (KES/UGX/TZS/RWF, `views/partials/currency-switcher.ejs`) that converts
  *displayed* prices via an admin-editable rate table. **These are not live
  market rates** — no single free API reliably covers this specific
  currency set — so `/admin/fx-rates` is where you keep them current
  manually; seeded with illustrative starting values. An order placed while
  browsing in a non-KES currency records that currency on the order
  (`orders.currency`) purely for display and for sizing a regional mobile
  money charge — the underlying KES amount is what's actually quoted.
- **Cross-border Intra-EAC delivery + regional mobile money**
  (`lib/cross-border.js`, `lib/regional-momo.js`,
  `POST /marketplace/orders/:id/pay-regional`). A fourth delivery method,
  "Cross-Border — Uganda, Tanzania, or Rwanda", adds a destination-country
  field and an estimated logistics cost from a static rate card
  (`CROSS_BORDER_RATE_CARD` — a planning estimate to confirm with your
  logistics team before dispatch, not a live courier-API quote; DHL
  Express, G4S Regional, and Fargo Cross-Border are the illustrative
  partners). Once quoted, a client paying in UGX can trigger an **MTN
  MoMo** Request-to-Pay; a client paying in TZS or RWF can trigger an
  **Airtel Money** collection request — both convert the KES-quoted amount
  at the current `fx_rates` figure and, without
  `MOMO_SUBSCRIPTION_KEY`/`MOMO_API_USER`/`MOMO_API_KEY` or
  `AIRTEL_CLIENT_ID`/`AIRTEL_CLIENT_SECRET` set, simulate the push exactly
  like M-Pesa's sandbox mode does. Get sandbox keys at
  [momodeveloper.mtn.com](https://momodeveloper.mtn.com) ("Collections"
  product) and [developers.airtel.africa](https://developers.airtel.africa)
  ("Collection" API).
- **AI-assisted brief structuring** (`lib/ai-brief.js`, the "AI Assist"
  button on the Custom Brief form). Turns a client's free-text brief into a
  structured summary — category, quantity, dimensions, colour mode,
  placement notes — shown to both the client and the assigned vendor
  (`ai_brief_json` on the order). **This is text-to-structure, not
  text-to-artwork** — it does not generate any visual design. With
  `ANTHROPIC_API_KEY` set in `.env` (get one at
  [console.anthropic.com](https://console.anthropic.com)), it calls the
  real Claude API with a forced JSON tool-call schema; without it, a
  keyword/regex heuristic (`heuristicStructure()`) does a reasonable first
  pass instead, clearly labelled `"method": "heuristic"` vs. `"method":
  "ai"` in the stored result so you always know which one produced it.

  ⚠️ **v4's schema changes are not backward-compatible with v3** (new
  `CHECK`-constrained columns on `users`, `orders`, and `payments`, plus the
  new `fx_rates` table). Back up, delete `db/*.sqlite*`, then `npm run seed`
  again.

## v5 — Real brand assets, live mockup editor & production job cards

This build replaces placeholders with real assets the client supplied, and
adds a working canvas-based mockup tool plus a per-stage production
checklist:

- **Real TrioCraft logo + brand colours** (`public/img/triocraft-icon.svg` /
  `.png`, `lib/site-config.js`'s `brand` object). The client supplied the
  actual logo as a PNG; it was vector-traced with `potrace` into a clean SVG
  rather than shipped as a raster image, so it scales crisply at any size.
  The orange used everywhere (`#ED5B00`) is sampled directly from that file
  — not the approximate `#E05A47` floated earlier in planning — and the navy
  (`#002B49`) is the client's stated brand navy. Both are used for the
  header/footer/sidebar mark, the browser favicon, and the invoice PDF
  header; **they do not replace** the existing `--ink` / `--rust` design
  tokens used everywhere else in the UI, which were already navy/rust in
  spirit — recolouring the entire site wasn't requested and wasn't done.
- **Real catalogue photography** (`db/seed.js`, `image` column on
  `products`). Eight catalogue products — the mug, polo shirt, roll-up
  banner, and business card already seeded, plus four new products (Premium
  Branded Hoodie, Executive Notebook & Pen Set, Insulated Vacuum Flask, A4
  Tri-Fold Brochure) — now carry a real photo, hotlinked directly from
  Unsplash's own image-delivery CDN (`images.unsplash.com/photo-<id>`, their
  documented dynamic-resize API — nothing is scraped or self-hosted). Each
  URL was resolved individually from its Unsplash photo page (not guessed
  from the page's share-link ID, which is a different identifier than the
  real CDN asset ID) before being wired in. ⚠️ These are external hotlinks —
  if Unsplash ever removes a photo or the CDN path changes, that one image
  breaks; swap the URL in `db/seed.js` (or point `products.image` at a
  self-hosted file in `public/img/`) if you want photography you fully
  control. The remaining catalogue items (reception wall branding, vehicle
  decals, gift box, exhibition stand, company profile) are unphotographed
  categories outside what was requested this pass and still show the
  category-icon placeholder.
- **Live canvas mockup editor** (`public/js/mockup-editor.js`, the product
  page). A dependency-free `<canvas>` tool: upload a logo (PNG/SVG), drag it
  into position, resize it with a slider, and toggle a bleed/safe-margin
  overlay using the same "3mm bleed, 3mm safe margin" language as the real
  pre-flight checker (`lib/preflight.js`). It draws a simple product
  silhouette per category (apparel, card, mug, banner) with plain canvas
  primitives when a product has no photo, or uses the real photo as the
  base layer when one exists. This is a **placement preview, not a
  colour-accurate proof** — the canvas is sRGB, not the job's print CMYK —
  and it's stated as such on the page. Composing "Add to Cart" saves the
  composited PNG (`uploads/mockups/`, `orders.mockup_filename`) so the
  client, admin, and assigned vendor all see exactly what was previewed,
  right on the order page.
- **KRA e-TIMS simulated QR + control number** (`lib/etims.js`,
  `lib/invoice-pdf.js`). Every simulated fiscal invoice (still the only mode
  available without real KRA-approved VSCU/OSCU middleware credentials — see
  v4's e-TIMS notes, unchanged) now also generates a control number and a
  real scannable QR code (`qrcode` npm package) embedded in the invoice PDF.
  **The QR payload is deliberately, unmissably fake** — it encodes plain
  text stating "SIMULATED — NOT A REAL KRA FISCAL RECEIPT" plus the sim
  invoice/control numbers, not a KRA verification URL — and the PDF prints
  "SIMULATED — NOT A REAL KRA VERIFICATION CODE" directly under it in
  orange. This was a deliberate call: generating something that *looks*
  like a genuine KRA fiscal signature without a real certified integration
  would be a fake tax-compliance mark on a real invoice, so the simulated
  QR is built to be obviously inert if anyone actually scans it. Once real
  `ETIMS_API_URL`/`ETIMS_API_KEY` are set, the same code path renders
  whatever verification string/QR the middleware provider returns instead.
- **Production job cards** (`routes/vendor.js`'s `JOB_CARD_CHECKLISTS`, the
  vendor order page). Each stage a production partner can self-advance
  through now shows a short, real checklist before the "Advance" button —
  Pre-Press Checklist, CMYK Colour Proofing, Substrate Inspection, Final
  Quality Check, and Packaging & Dispatch, one per stage. This is an
  accountability record, not a hard gate: nothing blocks advancing if a box
  is left unchecked, but whatever *is* ticked gets folded straight into the
  timeline note, so admin and the client see exactly what was confirmed
  before the job moved forward.

  This pass adds plain (non-`CHECK`-constrained) columns only
  (`products.image` was already in the v1 schema and unused;
  `orders.mockup_filename`, `orders.etims_control_number`,
  `orders.etims_simulated`, `orders.etims_qr_data_url` are new) — no schema
  rebuild is required to upgrade from v4, though the shipped copy is
  reseeded fresh regardless.

## v6 — 11-division capability statement & service-category tagging

This build re-taxonomizes the site's service categories to match TrioCraft's
formal Capability Statement (11 lettered divisions, A–K) and threads a
Service Category tag through invoicing, job cards, briefs, and the mockup
editor:

- **11-division taxonomy** (`db/schema.sql`, `db/seed.js`). Categories now
  carry a `service_code` letter (A–K) matching the capability statement:
  **A** Graphic Design & Creative, **B** Apparel & Wearable Branding, **C**
  Large Format & Environmental Branding, **D** Vehicle Branding, **E** Print
  & Marketing Materials, **F** Promotional Merchandise, **G** Packaging &
  Branded Bags, **H** Event Branding & Activation, **I** Brand Strategy &
  Consultation, **J** Project Management & Execution, **K** Digital &
  Innovation. The old 9-category set (v1–v5) is migrated onto this in
  `db/seed.js`, not dropped-and-reinserted: a renamed category (e.g.
  `corporate-branding` → `graphic-design-creative`) updates its existing row
  in place, so every product/provider/order that already pointed at its id
  keeps working with no dangling foreign keys — verified against a
  simulated pre-v6 database before shipping. `environmental-branding` is
  merged into the new **C** division; anything still pointing at it is
  reassigned before the now-empty row is deleted. Three new illustrative
  service line items were added for the three brand-new divisions (I, J, K),
  since those hadn't existed as orderable items before — a brand strategy
  workshop, on-site production project management, and a digital brand
  template pack — quotable through the same Custom Brief flow as everything
  else.
- **Capability Statement page** (`views/services.ejs`,
  `routes/marketing.js`). `/services` is now a formal capability-statement
  document: company overview, all 11 divisions as expandable cards (each
  with material standards, finishing options, and how it's invoiced against
  an LPO — production specs, not fabricated third-party certifications),
  key differentiators, the six-step project methodology, quality &
  compliance points, client value proposition, and contact details, framed
  for enterprise/government/NGO/political clients.
- **Service Category tagging** (`lib/invoice-pdf.js`, `routes/marketplace.js`,
  `routes/admin.js`, `routes/vendor.js`, the three order-detail views). Every
  order now resolves a Service Category (from the product's category for
  catalogue orders, or a new `orders.category_id` column for product-less
  Custom Brief orders) and shows it: as an orange tag line on proforma/tax
  invoice PDFs, and as a small lettered pill on the client/admin/vendor order
  pages — including next to the vendor's job-card checklist. The KRA e-TIMS
  simulated QR/control-number behaviour from v5 is unchanged (still clearly
  labeled simulated, still real and testable, still not a genuine KRA fiscal
  signature — see v5's notes above for why).
- **AI Brief now maps to all 11 divisions** (`lib/ai-brief.js`). Both the
  heuristic fallback and the Claude-API path recognise the new category
  slugs, and a category-specific follow-up prompt is appended once a
  category is identified — e.g. a vehicle-branding brief gets asked about
  wrap coverage/vehicle count, an event-branding-activation brief gets asked
  about the event date/teardown window, a brand-strategy brief gets asked
  about political/corporate advisory sensitivities. The heuristic matcher
  was also changed from "first category with any keyword hit" to "category
  with the most keyword hits," since a few real briefs (e.g. "coordinate 5
  vendors for a multi-site office branding rollout") legitimately share
  terms across categories and the old first-match logic picked the wrong
  one in testing.
- **Mockup editor: 3 new silhouettes** (`public/js/mockup-editor.js`,
  `views/partials/product-body.ejs`). Added `rollup` (a tapered retractable
  stand, distinct from the flat fabric banner), `vehicle` (a door/side-panel
  outline), and `notebook` (a hardcover book with page-edge lines) —
  dependency-free canvas primitives like the original four. Silhouette
  selection now checks an exact per-product override first, then falls back
  to a per-category default, since a few categories (e.g. Large Format &
  Environmental Branding) now cover visually different items.
- **Contact numbers updated** (`lib/site-config.js`) to the pair given in
  the current capability statement (`+254 712 157 358` /
  `+254 716 795 777`), replacing the earlier `0111 206 420` line — this
  propagates everywhere automatically since header/footer/contact page all
  read from this one config object. ⚠️ **One assumption made here**: no
  separate WhatsApp number was given this round, so — mirroring the prior
  setup's pattern of using the secondary line for WhatsApp — the second
  number (`716 795 777`) is now used as the WhatsApp deep-link target. If
  WhatsApp should stay on a different line, override it with the
  `WHATSAPP_NUMBER` environment variable (no code change needed).

  This pass adds two plain (non-`CHECK`-constrained) columns —
  `categories.service_code` and `orders.category_id` — so, like v5, no
  schema rebuild is required to upgrade an existing install; the shipped
  copy is reseeded fresh regardless.

## v7 — Full catalogue depth, a dedicated Graphic Design page, real contact details & brand cleanup

This build fills in nearly every remaining placeholder across the site —
catalogue depth, portfolio photography, a fully-built-out service page for
one division — and applies a set of client-requested branding and
content-accuracy fixes site-wide:

- **Catalogue expanded from 16 to 33 products** (`db/seed.js`), across all
  11 service categories, each carrying a license-checked free Unsplash photo
  or (where the client's own accurate mockup exists) the real supplied
  image — see the Images note below for which is which. New line items:
  Apparel & Wearable Branding gained Round Neck T-Shirt, Corporate Branded
  Shirt, and Branded Cap (Polo and Hoodie already existed with real photos).
  Large Format & Environmental gained a 3x3m Branded Event Tent,
  Step-and-Repeat Backdrop, Floor Graphics Decal, and Window Graphics Decal
  (Roll-Up Banner and Reception Wall Branding already existed with real
  photos). Vehicle Branding gained Full Vehicle Wrap, Fleet Branding
  Package, and Motorbike Branding. Every other category gained 1–2 further
  line items (Letterhead & Stationery Set, Branded Tote Bag, Branded
  Packaging Pouch, Brand Activation & Experiential, Logo & Brand Identity
  Design, Custom Illustration & Artwork, Social Media Content Pack) so no
  category is left thin. **Narrow vs wide roll-up banners** are modelled as
  a `Size` product-option variant on the existing, accurately-photographed
  Roll-Up Banner product (Narrow 60x160cm default, Wide 100x200cm +KES
  1,400) rather than a second SKU — no genuinely free, accurately-matching
  photo of a wide-format stand could be sourced, and a mismatched photo
  would have been worse than none. X-banner stands and teardrop flags were
  deliberately not added for the same reason (no accurately-matching free
  photo found).
- **Graphic Design & Creative now has its own full page**
  (`routes/marketing.js`, `views/service-graphic-design.ejs`, reachable at
  `/services/graphic-design-creative` and linked from both the `/services`
  capability card and the footer). Beyond the generic capability-statement
  card, it has its own 6-item sub-service breakdown (Logo & Brand Identity,
  Brand Guidelines & Company Profile, Custom Illustration, Social Media
  Content Design, Packaging & Label Design, Print Collateral Design, each
  linking to its catalogue product where one exists), a design-specific
  6-step process distinct from the site-wide production methodology
  (Discovery Brief → Concept & Moodboard → Design Development → Client
  Revision Round → Final File Handoff → Production Handover), a
  deliverables/file-format list, a real case-study tie-in (the Finovation
  project), and an FAQ accordion (reusing the existing `.cap-card`
  details/summary pattern — no new JS). This is the depth pattern other
  categories can follow as they grow their own dedicated pages.
- **Portfolio photography completed** (`data/projects.js`). The 5 remaining
  placeholder "Our Work" projects (Nairobi Tech Hub Summit, Urban Threads
  Launch, Mama Mboga Fleet Wrap, GreatRift Wines Packaging, Precious Gift
  School Signage) now carry license-checked free Unsplash photography, per
  explicit client sign-off to use generic stock/mockup imagery for these
  illustrative case studies (they were never presented as real named
  clients). The Savanna Coffee project reuses the client's own Reception
  Wall Branding product photo instead of stock, since it's a more authentic
  match. Finovation (added in v6) already had a real client-supplied photo.
- **Contact details replaced site-wide** (`lib/site-config.js`, `.env`,
  `.env.example`): both prior phone numbers are gone, replaced by the
  single confirmed line `+254 111 206 420` (used for display, `tel:` links,
  and the WhatsApp deep link default); email is `triocraft.brands@gmail.com`.
  New `site.social` object (Instagram/Facebook/TikTok, handle
  `triocraft.brands`) is linked from the footer and the contact page.
- **"TrioCraft" wordmark recolored to one uniform orange**
  (`public/css/styles.css`) — `--brand-orange: #ED5B00` (the client's actual
  logo orange) applied only to `.brand-name` in the header and footer,
  deliberately left distinct from the pre-existing `--rust` design-system
  accent so the rest of the palette is untouched. All 4 remaining CSS
  gradients (`.hdr-av`, `.hero`, `.blog-card .thumb`,
  `.project-card/.work-card .thumb`) were flattened to solid colours per
  the client's "reduce AI theme features, gradients" request.
- **"Division X ·" labels removed from visible copy** (`views/services.ejs`,
  `views/about.ejs`, `views/index.ejs`, `views/partials/site-footer.ejs`,
  and the `/services` meta description in `routes/marketing.js`) — "11
  divisions, A–K" → "11 core service categories", "Browse Division X →" →
  "Browse [Category Name] →", etc. The single lettered badge on each
  capability card (e.g. the "A" in a circle) was deliberately kept — that's
  a code, not the word "Division" — and `service_code` still exists in the
  schema/data for anyone who wants it back.
- **`upsertProduct` now refreshes name/description on every reseed**
  (`db/seed.js`) — previously it only ever backfilled a missing `image` onto
  an existing row, so a genuine rename (like the Roll-Up Banner losing its
  "(85x200cm)" suffix once Size became a variant) silently never took
  effect on an already-seeded database. Re-running `node db/seed.js` now
  keeps name/description in sync with the seed source going forward.

## v8 — Catalog prices corrected against real Kenya market research

A companion `TrioCraft_Service_Breakdown_&_Pricing_Guide.docx` was produced
separately (not part of this codebase) covering all 11 categories against
real Nairobi/Kenya market pricing gathered from live competitor and
supplier sites. That research found 10 catalog items priced below their
researched market floor; this pass corrects them (`db/seed.js`):

| Product | Old price | New price | Researched market floor |
|---|---|---|---|
| Logo & Brand Identity Design | 35,000 | 65,000 | 40,000 (full identity system) |
| Brand Positioning & Campaign Strategy Workshop | 45,000 | 120,000 | 60,000 (weak evidence — quote-based market) |
| Roll-Up Banner (narrow, 60x160cm) | 4,800 | 7,800 | 5,400 |
| Roll-Up Banner (wide, 100x200cm — Size delta) | +1,400 (6,200 total) | +4,200 (12,000 total) | 10,500 |
| Branded Event Tent / Gazebo (3x3m) | 45,000 | 80,000 | 65,000 |
| Reception Wall Branding | 18,000 | 85,000 | 60,000 (largest gap found — was less than a third of market floor) |
| Corporate Letterhead & Stationery Set | 35/unit | 45/unit | ~44/unit (500-unit set ÷ 500) |
| Step-and-Repeat Backdrop | 15,000 | 38,000 | 20,000 |
| Social Media Content Design Pack | 18,000 | 32,000 | 30,000 (agency-level scope) |
| Digital Brand Template Pack | 12,000 | 24,000 | 15,000 (weak evidence) |

Items the research flagged as already "within range" or reasonably "above
market" for a premium position (the polo, hoodie, t-shirt, cap, business
cards, tote bag, notebook set, and others) were deliberately left
unchanged — this pass only raises prices that were genuinely below what
the Kenyan market actually charges, not a general price increase.

This surfaced two gaps in `upsertProduct`/`upsertOptionGroup` from v7's own
reseed-refresh fix: `base_price`/`min_quantity` were still never synced on
an existing row (only `name`/`description` were), and an option group's
existing *values* (e.g. the Roll-Up Banner's Size deltas) were never synced
at all once the group itself existed — both silently no-op'd a real price
change on an already-seeded database. Both functions now sync fully by
value label on every reseed, so a price edit here always takes effect with
a plain `node db/seed.js` — no manual DB surgery or fresh-database reseed
required.

## What's already wired up end to end

- **Client**: browse catalogue → configure a product (option groups +
  quantity-tier pricing, computed live and re-verified server-side) → add
  to cart → choose a delivery method (including cross-border EAC) →
  checkout → order appears in Active Orders with a live timeline. Once
  quoted, pay the outstanding balance straight from the order page via
  M-Pesa STK Push (or MTN MoMo/Airtel Money for a non-KES order), with
  payment status updated automatically from the provider's callback. A
  verified corporate account can check out on Net 30/60/90 credit terms
  with an uploaded LPO instead of paying immediately. Brand Vault supports
  file uploads (logo, guidelines, fonts) with automatic pre-press checks,
  and hex colour swatches. Custom Brief for anything outside the catalogue,
  with an "AI Assist" button that structures the free-text brief. Every
  product page has a live canvas mockup editor — upload a logo, drag/resize
  it onto the product, toggle the bleed/safe-margin guide — and the
  composited preview travels with the order. A currency switcher
  (KES/UGX/TZS/RWF) changes displayed prices everywhere; WhatsApp
  deep-links appear on the cart, brief, and every order page.
- **Admin**: dashboard with pipeline stats (including pending payments,
  corporate accounts, and overdue invoices), all-orders view with status
  filters, per-order management (assign provider by specialty, set quote,
  update payment/status/delivery method — each change writes a timeline
  entry and sends a WhatsApp status update to the client), a full
  pricing-engine editor per product (add/remove option groups, values with
  price deltas, and quantity tiers), provider management (including
  specialty), full CRUD on Resources/Blog posts (the Production
  Marketplace guide is already seeded and editable from `/admin/blog`),
  `/admin/clients` to verify a corporate account and set its credit terms,
  `/admin/fx-rates` to keep the EAC display-currency rates current, and an
  "Issue Invoice" action per order that generates an invoice number, a real
  downloadable PDF, an e-TIMS fiscal reference, and client notifications.
- **Vendor**: sees only orders assigned to their linked provider (with their
  provider profile's specialty and turnaround shown on the dashboard), and
  advances an order through their segment of the real production sequence
  (pre-press → pre-press approved → in production → quality check → ready
  for dispatch → out for delivery) with notes logged to the shared timeline
  and a WhatsApp status update sent to the client on every advance. Each
  stage's job card shows a short real checklist (Pre-Press Checklist, CMYK
  Colour Proofing, Substrate Inspection, Final Quality Check, Packaging &
  Dispatch) that folds into the timeline note when ticked. The order page
  also surfaces the AI-structured brief summary, the client's logo
  placement preview from the mockup editor, and the cross-border
  destination/logistics estimate when relevant to production.

Verified locally end-to-end before delivery: a full order was placed as the
client account with a configured option set and volume-tier pricing,
checked out with a delivery method, paid via a simulated M-Pesa STK push
(and the Daraja callback confirmed against the payments table and order
status), assigned + quoted + routed to a specialist provider as admin, and
advanced through every production stage as the vendor account — with each
change confirmed visible back on the client's order page. For v4: a
cross-border order was checked out with a destination country and
estimated logistics cost, then paid via simulated MTN MoMo and Airtel
Money (Tanzania and Rwanda) with the KES amount correctly converted per
provider's currency; a corporate account checked out on Net 30 terms with
an uploaded LPO, and admin issued a real invoice PDF with a simulated
e-TIMS reference and WhatsApp/email notifications; the FX-rate admin
editor was confirmed to persist a rate change; and the AI Assist heuristic
fallback was confirmed to structure a raw brief without an Anthropic key
set.

## Deploying to your own Node host

1. Push this project to your host (git deploy, rsync, or however you
   normally ship). **Do not commit `node_modules/`, `.env`, or the
   `db/*.sqlite` files** — `.gitignore` already excludes them.
2. On the server: `npm install --production`
3. Create `.env` from `.env.example` and set a real `SESSION_SECRET`.
4. Run `npm run seed` once to create and populate the database file.
5. Start it with `npm start`, or better, under a process manager
   (`pm2 start server.js --name triocraft`, or your host's equivalent) so it
   restarts automatically.
6. Point your existing domain/reverse proxy (nginx, Caddy, or your host's
   built-in routing) at the Node process's port (`PORT` in `.env`, default
   3000).
7. **Change or remove the demo admin/vendor/client passwords** seeded above
   before this is public.
8. The SQLite database is a single file (`db/triocraft.sqlite`) — back it up
   the same way you'd back up any file on the server (most hosts have a
   scheduled snapshot option; otherwise a simple cron `cp` to another disk
   or object storage works).

## Known gaps to close before this replaces a production checkout flow

This is a complete, working MVP of the full lifecycle — it is **not** yet
handling real money movement or outbound email out of the box, since I had
no live payment or SMTP credentials to wire in:

- **Payments**: the M-Pesa STK Push flow (`lib/mpesa.js`, `routes/payments.js`)
  is fully built and end-to-end tested in its simulated mode — it just needs
  real Daraja credentials in `.env` to move real money (see "Turning on real
  M-Pesa payments" above). Cash/bank payments still fall back to the manual
  `payment_status` dropdown on `/admin/orders/:id`. A card processor
  (Stripe, Flutterwave, Pesapal) isn't wired in — add it as a second method
  alongside M-Pesa in `routes/payments.js` if you need one.
- **Email notifications**: the plumbing (`lib/mailer.js`) is complete and
  wired into the contact form, cart checkout, and custom briefs — it just
  needs real SMTP credentials in `.env` to actually send (see "Turning on
  real email" above). Order **status-change** emails to clients (e.g. "your
  order moved to In Production") aren't wired yet — add a `notify()` call in
  `routes/admin.js`'s `/admin/orders/:id/update` and `routes/vendor.js`'s
  `/vendor/orders/:id/advance` once you want those. Similarly, a payment
  confirmation email on a successful M-Pesa callback would be a natural
  addition to `routes/payments.js`'s `/api/mpesa/callback` handler.
- **Pre-flight checks are a first pass, not a RIP**: `lib/preflight.js`
  flags likely-RGB files and low resolution, and always reminds about
  bleed — it doesn't parse ICC colour profiles, verify actual bleed/trim
  boxes, or convert anything to CMYK. Treat warnings as "ask the client" cues
  for your design team, not a pass/fail gate.
- **Multi-vendor routing is manual today**: admin assigns a provider by
  reading their `specialty` and turnaround off the picker — there's no
  automatic "best match" algorithm or capacity/load balancing across
  providers with the same specialty. That's a reasonable next step once you
  have enough order volume to need it.
- **Images**: all 33 catalogue products now carry real photography (see the
  v7 section above for the catalogue-expansion count). 6 use the client's
  own TrioCraft-branded mockup renders, supplied directly (not sourced by
  Claude) and served locally from `public/img/products/` (resized/
  re-encoded from the originals — they arrived as 11–22MB full-res PNGs
  mislabeled `.jpg` and were downscaled to ~1200px JPEGs for reasonable page
  weight): Branded Ceramic Mug, Corporate Polo Shirt (an alternate
  white-logo version of the same polo sits alongside it at
  `corporate-polo-shirt-alt.jpg`, unused — swap it in or add a gallery field
  if you want both), Premium Heavyweight Branded Hoodie, Roll-Up Banner,
  Reception Wall Branding, and Luxury Gift Box. The remaining 27 use
  license-checked free Unsplash photography (`images.unsplash.com`, never
  `plus.unsplash.com` — see the v5 section above for the external-hotlink
  caveat, which still applies to all of these).
  The "Our Work" portfolio (`data/projects.js`) now has real/illustrative
  photography on all 7 entries: Finovation — Corporate Identity & Reception
  Branding uses a client-supplied photo of a real completed project
  (confirmed by the client, not assumed) — location and full project scope
  beyond what's visible in the photo are left generic pending real details.
  The other 6 (5 generic-name placeholder case studies plus Savanna Coffee,
  which reuses the client's own Reception Wall Branding photo) use
  license-checked free Unsplash photography, per explicit client sign-off —
  they were never presented as real named clients, so illustrative stock is
  appropriate there. `views/work.ejs` and `views/index.ejs`'s project strip
  already render a real `<img>` when `image` is set (falling back to the
  emoji tile otherwise). The blog-post thumbnail and `public/img/og-default.svg`
  are still unphotographed — a real photo would make a better social-share
  preview than the branded SVG placeholder whenever one exists.
  Two supplied marketing images (`public/img/site/apparel-new-collection.jpg`,
  `apparel-lineup.jpg`) appear as a homepage "Apparel & Wearable Branding"
  showcase band, and the Nairobi skyline photo (`nairobi-skyline.jpg`) appears
  on the About page.
- **Projects data**: `/work` and the homepage's featured-work strip read
  from the static array in `data/projects.js`, not the database — exactly
  as the phased plan intended (start static, migrate once you want it
  admin-editable). When ready, add a `projects` table
  (title, slug, category, location, description, cover_image, gallery,
  featured, sort_order) to `db/schema.sql`, seed it, and swap the
  `require('../data/projects')` calls in `routes/marketing.js` for
  `db.prepare(...)` queries.
- **npm audit**: `better-sqlite3`'s native build tooling pulls in a few
  deprecated transitive packages; none are exposed at runtime, but run
  `npm audit` after `npm install` on your host and address anything your
  security policy requires. `image-size` currently has an unpatched
  high-severity DoS advisory affecting its ICNS/JXL/HEIF parsers — this
  codebase only ever calls it on `.jpg/.jpeg/.png/.webp/.bmp/.gif` uploads
  (see `RASTER_EXTENSIONS` in `lib/preflight.js`), which aren't the affected
  formats, but re-check this if you widen accepted upload types.
- **KRA e-TIMS is a documented integration point, not a certified client**:
  `lib/etims.js` simulates a fiscal invoice number until `ETIMS_API_URL` /
  `ETIMS_API_KEY` point at a real KRA-approved VSCU/OSCU middleware
  provider — there is no generic e-TIMS sandbox to test against the way
  Daraja offers one for M-Pesa, so this needs real onboarding with a
  provider before it can issue invoices KRA will actually recognise.
- **EAC FX rates are manually maintained, not a live feed**: `/admin/fx-rates`
  is the source of truth for the KES↔UGX/TZS/RWF conversion shown to
  clients; no free API reliably covers this exact currency set, so budget
  for someone to check and update these periodically (daily/weekly,
  depending on how much rate drift your margins can absorb).
- **Cross-border logistics costs are a rate card, not a live courier quote**:
  `CROSS_BORDER_RATE_CARD` in `lib/cross-border.js` is a starting reference
  table for planning purposes — confirm the actual cost with your courier
  (DHL, G4S Regional, Fargo Cross-Border, or whoever you contract) before
  dispatch, and update the table as your actual contracted rates change.
- **AI-assisted brief structuring only structures text, it doesn't design**:
  `lib/ai-brief.js` turns a brief into category/quantity/dimensions/colour
  mode/placement-notes fields — useful for routing and production, but it
  is not a text-to-artwork generator and won't produce any visual mockup.

## Extending it

- New service category or product → add rows via `/admin/catalogue`, or
  extend `db/seed.js` for anything you want seeded automatically on fresh
  installs.
- New pricing option group, value, or quantity tier on an existing product →
  `/admin/catalogue` now has an editor for exactly this per product, or
  extend `db/seed.js`'s `upsertOptionGroup()` / `upsertQuantityTiers()`
  calls for anything you want pre-seeded.
- New blog/resources post → `/admin/blog/new`, or add another `upsertPost(...)`
  call in `db/seed.js`.
- New order stage or role → the status list lives in one place per file —
  `STATUS_LABELS` / `STATUS_PROGRESS` near the top of `routes/admin.js`,
  `routes/marketplace.js`, and `routes/vendor.js` (kept identical across all
  three by convention), and `NEXT_STATUS` in `routes/vendor.js` for the
  segment a production partner can self-advance through — update those plus
  the `CHECK` constraint in `db/schema.sql`, and the matching `.badge-*`
  class in `public/css/styles.css`.
- New delivery method or partner → add an entry to the `DELIVERY_METHODS`
  array in `lib/delivery.js`; it's the single source of truth used by the
  cart, custom brief, and every order-detail view.
- New payment method → `routes/payments.js` currently only wires up M-Pesa;
  a card processor would be a second route following the same pattern
  (initiate → store a `payments` row → webhook/callback updates it).

## Roadmap — Expansion Vectors (notes only, not built this pass)

Three further ideas came up alongside the v4 feature set. None of these are
implemented in this codebase — by request, they're documented here as an
architecture/sequencing sketch for a future build, not shipped as routes,
views, or schema changes.

### TrioCraft Reseller Hub

A white-label layer letting approved resellers (agencies, freelance
designers, other print brokers) sell TrioCraft's catalogue under their own
markup and branding, with TrioCraft fulfilling behind the scenes.

- **Target audience**: design agencies and freelancers who want to offer
  print without owning production; smaller print shops wanting overflow
  capacity from a larger network.
- **Sketch of the shape it'd take**: a new `reseller` account type (sibling
  to the `corporate` one added in v4) with its own markup percentage per
  product or category; a `reseller_orders` table (or a `reseller_id` +
  `markup_applied` column pair on `orders`) so TrioCraft's internal cost and
  the reseller's client-facing price are both tracked; a reseller-scoped
  dashboard (`/reseller`, mirroring the `/vendor` pattern already
  established) showing only their own client orders with their markup, not
  TrioCraft's base cost; white-label considerations for the client-facing
  order-status page (custom logo/domain) which would be the most involved
  part.
- **Suggested build sequence**: (1) reseller account type + markup field,
  (2) reseller order creation flow reusing the existing marketplace cart
  with a markup applied at quote time, (3) reseller dashboard, (4)
  white-label branding layer once the core flow is proven.

### Smart Asset Vault & Brand Portal (SaaS)

Brand Vault (already built in v3 — logo/guideline/font uploads with
pre-flight checks) generalised into a standalone, multi-tenant brand asset
management product other businesses could subscribe to independently of
placing a print order.

- **Target audience**: marketing teams and agencies managing brand assets
  across multiple team members/departments, who'd pay for a dedicated
  brand portal whether or not they're actively ordering print from
  TrioCraft.
- **Sketch of the shape it'd take**: a `tenants`/`organizations` table above
  `users` (today's `users` table is flat, single-tenant); per-tenant asset
  libraries, folders, and version history (today's `brand_assets` is a flat
  per-user list with no folder or versioning concept); role-based access
  within a tenant (owner/editor/viewer); a subscription/billing layer
  (Stripe or a regional equivalent) gating access by plan tier; an API or
  embeddable widget for pulling approved brand assets into other tools.
- **Suggested build sequence**: (1) introduce the tenant/organization
  concept and migrate `brand_assets` to be tenant-scoped with folders, (2)
  add roles within a tenant, (3) billing/subscription gating, (4) external
  API access once the core product is validated with a few pilot tenants.

### POD Merch API for Local Creator Economy

An API-driven print-on-demand integration letting e-commerce stores,
independent artists, and media personalities sell custom apparel/merch
that TrioCraft fulfills automatically per order, without a human quoting
each one.

- **Target audience**: e-commerce store owners (Shopify, WooCommerce),
  individual artists/creators, and online media personalities who want a
  "sell merch with your design, we handle production and shipping" flow.
- **Sketch of the shape it'd take**: a public, API-key-authenticated REST
  endpoint (`POST /api/v1/pod-orders` or similar) that accepts a design
  file + product + quantity + shipping address and returns a tracked order
  ID — this needs the v3 pricing engine to run **without** a human quoting
  step (today, catalogue orders still flow through an admin "set quote"
  stage for anything without pre-set tiers), plus webhook callbacks
  (order status, shipment tracking) back to the calling store; a signed
  webhook or OAuth app for Shopify/WooCommerce specifically would come
  after the raw API is proven; automatic file validation against the v3
  pre-flight checks (`lib/preflight.js`) becomes a hard gate rather than an
  advisory warning, since there's no human reviewing the file before
  production starts.
- **Suggested build sequence**: (1) API-key auth + a POD-specific order
  creation endpoint that fully bypasses manual quoting for products with
  complete pricing tiers, (2) webhook callbacks for status/tracking, (3)
  harden pre-flight checks into a pass/fail gate for this path
  specifically (catalogue/custom-brief orders keep the advisory-only
  behaviour), (4) a Shopify/WooCommerce app wrapper once the raw API is
  stable.
