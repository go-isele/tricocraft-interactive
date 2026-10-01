// Seeds the database with TrioCraft's real service catalogue, a vetted
// provider network, demo products, an admin login, and the Production
// Marketplace blog post. Safe to re-run — it upserts rather than duplicating.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const db = require('./db');

// v6 — 11-division service taxonomy migration helper. `oldSlug` lets a
// category that's being renamed (e.g. 'corporate-branding' →
// 'graphic-design-creative' under the new capability-statement structure)
// have its EXISTING row updated in place rather than a second row inserted
// — every product/provider FK that already points at its id stays valid,
// with no need to wipe the database just to re-taxonomize it. Also now
// updates name/icon/description/service_code/sort_order on every re-run
// (not just insert-once), matching the "re-seeding backfills real data"
// pattern already used for products.image.
async function upsertCategory(name, slug, icon, description, service_code, sort_order, oldSlug) {
  let existing = await db.get('SELECT id FROM categories WHERE slug = ?', [slug]);
  if (!existing && oldSlug && oldSlug !== slug) {
    existing = await db.get('SELECT id FROM categories WHERE slug = ?', [oldSlug]);
  }
  if (existing) {
    await db.run('UPDATE categories SET name=?, slug=?, icon=?, description=?, service_code=?, sort_order=? WHERE id=?',
      [name, slug, icon, description, service_code, sort_order, existing.id]);
    return existing.id;
  }
  const info = await db.run(
    `INSERT INTO categories (name, slug, icon, description, service_code, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, slug, icon, description, service_code, sort_order]
  );
  return info.lastInsertRowid;
}

async function upsertProvider(name, categorySlug, opts = {}) {
  const cat = await db.get('SELECT id FROM categories WHERE slug = ?', [categorySlug]);
  const existing = await db.get('SELECT id FROM providers WHERE name = ?', [name]);
  if (existing) return existing.id;
  const info = await db.run(
    `INSERT INTO providers (name, category_id, vetted, pantone_matched, turnaround_days, location, rating, specialty, notes)
     VALUES (?, ?, 1, 1, ?, ?, ?, ?, ?)`,
    [name, cat ? cat.id : null, opts.turnaround_days || 7, opts.location || 'Nairobi, Kenya', opts.rating || 4.7, opts.specialty || null, opts.notes || null]
  );
  return info.lastInsertRowid;
}

async function upsertProduct(name, slug, categorySlug, description, base_price, min_quantity, image) {
  const existing = await db.get('SELECT id FROM products WHERE slug = ?', [slug]);
  if (existing) {
    // v5 — re-running seed on an already-seeded DB now also backfills real
    // photography onto products that were seeded before it existed, rather
    // than silently leaving them on the placeholder icon forever.
    if (image) await db.run("UPDATE products SET image = ? WHERE id = ? AND (image IS NULL OR image = '')", [image, existing.id]);
    // v7 — a product's name/description can legitimately change on the same
    // slug (e.g. "Roll-Up Banner (85x200cm)" → "Roll-Up Banner" once Size
    // became a variant) — keep these in sync on every reseed rather than
    // only ever backfilling image, so edits here always take effect.
    // v8 — base_price/min_quantity are just as live-editable as name/
    // description (e.g. a market-pricing pass correcting an underpriced
    // item) — sync those on every reseed too, rather than only ever letting
    // a price change take effect on a brand-new database.
    await db.run('UPDATE products SET name = ?, description = ?, base_price = ?, min_quantity = ? WHERE id = ?',
      [name, description, base_price, min_quantity, existing.id]);
    return existing.id;
  }
  const cat = await db.get('SELECT id FROM categories WHERE slug = ?', [categorySlug]);
  const info = await db.run(
    `INSERT INTO products (category_id, name, slug, description, base_price, min_quantity, image)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [cat ? cat.id : null, name, slug, description, base_price, min_quantity, image || null]
  );
  return info.lastInsertRowid;
}

// ── Print pricing engine demo data (option groups + values, quantity tiers) ──
async function upsertOptionGroup(productId, name, values) {
  const existing = await db.get('SELECT id FROM product_options WHERE product_id = ? AND name = ?', [productId, name]);
  const optionId = existing ? existing.id : (await db.run(
    'INSERT INTO product_options (product_id, name) VALUES (?, ?)', [productId, name]
  )).lastInsertRowid;
  // v8 — a value's price_delta is just as live-editable as a product's
  // base_price (e.g. the Roll-Up Banner's Wide-size delta after a market-
  // pricing pass) — sync existing values by label on every reseed instead
  // of only ever inserting values once, on a brand-new option group.
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const existingValue = await db.get(
      'SELECT id FROM product_option_values WHERE option_id = ? AND label = ?',
      [optionId, v.label]
    );
    if (existingValue) {
      await db.run(
        'UPDATE product_option_values SET price_delta = ?, is_default = ?, sort_order = ? WHERE id = ?',
        [v.delta || 0, v.isDefault ? 1 : 0, i, existingValue.id]
      );
    } else {
      await db.run(
        'INSERT INTO product_option_values (option_id, label, price_delta, is_default, sort_order) VALUES (?, ?, ?, ?, ?)',
        [optionId, v.label, v.delta || 0, v.isDefault ? 1 : 0, i]
      );
    }
  }
  return optionId;
}

async function upsertQuantityTiers(productId, tiers) {
  const existing = (await db.get('SELECT COUNT(*) AS n FROM product_quantity_tiers WHERE product_id = ?', [productId])).n;
  if (Number(existing) > 0) return;
  for (const t of tiers) {
    await db.run(
      'INSERT INTO product_quantity_tiers (product_id, min_qty, max_qty, unit_price) VALUES (?, ?, ?, ?)',
      [productId, t.min, t.max ?? null, t.price]
    );
  }
}

async function upsertUser(name, email, password, role, company, opts = {}) {
  const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return existing.id;
  const hash = bcrypt.hashSync(password, 10);
  const info = await db.run(
    `INSERT INTO users (name, email, password_hash, role, company, account_type, corporate_verified, credit_terms_days, kra_pin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name, email, hash, role, company || null,
      opts.accountType || 'retail', opts.corporateVerified ? 1 : 0, opts.creditTermsDays || null, opts.kraPin || null,
    ]
  );
  return info.lastInsertRowid;
}

async function upsertFxRate(code, kesPerUnit) {
  const existing = await db.get('SELECT currency_code FROM fx_rates WHERE currency_code = ?', [code]);
  if (existing) return;
  await db.run('INSERT INTO fx_rates (currency_code, kes_per_unit) VALUES (?, ?)', [code, kesPerUnit]);
}

async function upsertPost(post) {
  const existing = await db.get('SELECT id FROM blog_posts WHERE slug = ?', [post.slug]);
  if (existing) {
    await db.run(
      `UPDATE blog_posts SET title=?, eyebrow=?, excerpt=?, body_html=?, meta_description=?, read_minutes=? WHERE slug=?`,
      [post.title, post.eyebrow, post.excerpt, post.body_html, post.meta_description, post.read_minutes, post.slug]
    );
    return existing.id;
  }
  const info = await db.run(
    `INSERT INTO blog_posts (slug, title, eyebrow, excerpt, body_html, meta_description, read_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [post.slug, post.title, post.eyebrow, post.excerpt, post.body_html, post.meta_description, post.read_minutes]
  );
  return info.lastInsertRowid;
}

async function main() {
  await db.ensureSchema();

  // ── Categories — TrioCraft's 11-division capability-statement taxonomy ──
  // (v6). Each maps to a lettered Service Category (A–K) used to tag invoice
  // line items and vendor job cards. Old v1–v5 category slugs are migrated in
  // place via `oldSlug` so existing product/provider rows never dangle.
  const catA = await upsertCategory('Graphic Design & Creative', 'graphic-design-creative', '🎨',
    'Logo design & brand identity systems, brand guidelines, marketing & campaign creatives, company profiles & catalogues, packaging design, pitch decks.',
    'A', 1, 'corporate-branding');
  await upsertCategory('Apparel & Wearable Branding', 'apparel-wearable-branding', '👕',
    'Branded t-shirts, polo shirts & hoodies, reflector jackets & safety wear, corporate & institutional uniforms, campaign apparel (caps, lesos, scarves).',
    'B', 2, 'apparel-branding');
  const catC = await upsertCategory('Large Format & Environmental Branding', 'large-format-environmental', '📐',
    'PVC/fabric/mesh banners, roll-up & display systems, branded tents & flags, wall & office branding, exhibition stands.',
    'C', 3, 'large-format');
  await upsertCategory('Vehicle Branding', 'vehicle-branding', '🚚',
    'Full vehicle wraps, partial branding, fleet branding solutions, reflective safety branding.',
    'D', 4, null);
  await upsertCategory('Print & Marketing Materials', 'print-marketing-materials', '🖨️',
    'Business cards, flyers & brochures, company profiles & catalogues, stickers/labels & packaging prints, menus, loyalty cards.',
    'E', 5, 'printing');
  await upsertCategory('Promotional Merchandise', 'promotional-merchandise', '🎁',
    'Branded mugs & umbrellas, notebooks/diaries & pens, keyholders & wristbands, corporate gift sets & promotional kits.',
    'F', 6, null);
  await upsertCategory('Packaging & Branded Bags', 'packaging-branded-bags', '🛍️',
    'Custom printed gift bags, non-woven & tote bags, 3D packaging systems, custom packaging solutions.',
    'G', 7, 'packaging');
  await upsertCategory('Event Branding & Activation', 'event-branding-activation', '🎤',
    'Full event branding setup, stage backdrops & signage, branded booths & exhibition displays, experiential/activation branding, event giveaways.',
    'H', 8, 'event-branding');
  await upsertCategory('Brand Strategy & Consultation', 'brand-strategy-consultation', '🧠',
    'Brand development & positioning, campaign strategy & execution, rebranding & identity refresh, political & corporate branding advisory.',
    'I', 9, null);
  await upsertCategory('Project Management & Execution', 'project-management-execution', '⚙️',
    'End-to-end project coordination, vendor sourcing & management, quality assurance & control, production supervision, timely delivery management.',
    'J', 10, null);
  await upsertCategory('Digital & Innovation', 'digital-innovation', '💻',
    'TrioCraft Interactive client portal, real-time project tracking, AI-assisted design support, digital branding assets & templates.',
    'K', 11, null);

  // 'Environmental Branding' no longer exists as its own category — it's
  // merged into C (Large Format & Environmental Branding). If this DB was
  // seeded before v6, migrate anything still pointing at the old category id
  // onto C, then remove the now-empty row, so the taxonomy ends at exactly 11.
  const oldEnv = await db.get("SELECT id FROM categories WHERE slug = 'environmental-branding'");
  if (oldEnv && oldEnv.id !== catC) {
    await db.run('UPDATE products SET category_id = ? WHERE category_id = ?', [catC, oldEnv.id]);
    await db.run('UPDATE providers SET category_id = ? WHERE category_id = ?', [catC, oldEnv.id]);
    await db.run('UPDATE orders SET category_id = ? WHERE category_id = ?', [catC, oldEnv.id]);
    await db.run('DELETE FROM categories WHERE id = ?', [oldEnv.id]);
  }

  // ── Vetted production network ──
  await upsertProvider('Stitchline Ltd', 'apparel-wearable-branding', { turnaround_days: 6, specialty: 'Screen Printing & Embroidery', notes: 'Screen print & embroidery specialist.' });
  await upsertProvider('Merch Kenya', 'promotional-merchandise', { turnaround_days: 5, specialty: 'Promotional Items & Drinkware', notes: 'Promotional items, mugs, drinkware.' });
  await upsertProvider('PrintMasters KE', 'print-marketing-materials', { turnaround_days: 4, specialty: 'Offset Litho & Digital Print', notes: 'Full-colour litho & digital print.' });
  await upsertProvider('WrapPro Nairobi', 'vehicle-branding', { turnaround_days: 8, specialty: 'Vehicle Wraps & Reflective Branding', notes: 'Vehicle wraps & reflective branding.' });
  await upsertProvider('DesignHub EA', 'graphic-design-creative', { turnaround_days: 10, specialty: 'Brand Identity & Packaging Design', notes: 'Brand identity & packaging design.' });
  await upsertProvider('Signage & Structures EA', 'large-format-environmental', { turnaround_days: 9, specialty: 'Large Format Print & Structural Fabrication', notes: 'Banners, roll-ups, exhibition stands, office/wall branding installs.' });
  await upsertProvider('PackWorks Kenya', 'packaging-branded-bags', { turnaround_days: 7, specialty: 'Rigid Packaging & Branded Bags', notes: 'Gift boxes, tote/non-woven bags, 3D packaging systems.' });

  // ── Demo catalogue products ──
  // v5 — real photography (Unsplash, hotlinked via their own image-delivery
  // CDN — see README) added to the products it names, plus four new products
  // matching the requested categories. Every URL below was individually
  // resolved from its Unsplash photo page via WebFetch (not guessed from the
  // page-URL's short share ID, which is a different identifier than the real
  // CDN asset ID) before being wired in here.
  //
  // v6 follow-up — 6 of these now use the client's own TrioCraft-branded
  // mockup renders (supplied directly, not sourced by Claude) instead of
  // generic Unsplash stand-ins — served locally from public/img/products/,
  // resized/re-encoded from the originals to keep page weight reasonable.
  const mugId = await upsertProduct('Branded Ceramic Mug', 'branded-ceramic-mug', 'promotional-merchandise', 'Full-colour wraparound print, dishwasher-safe glaze.', 650, 50,
    '/static/img/products/branded-ceramic-mug.jpg');
  const poloId = await upsertProduct('Corporate Polo Shirt', 'corporate-polo-shirt', 'apparel-wearable-branding', 'Embroidered logo, pique cotton, S–3XL.', 1450, 20,
    '/static/img/products/corporate-polo-shirt.jpg');
  await upsertProduct('Premium Heavyweight Branded Hoodie', 'premium-branded-hoodie', 'apparel-wearable-branding', 'Screen-printed or embroidered logo, 320gsm heavyweight cotton fleece.', 3200, 20,
    '/static/img/products/premium-branded-hoodie.jpg');
  const roundNeckId = await upsertProduct('Round Neck T-Shirt', 'round-neck-tshirt', 'apparel-wearable-branding', 'Screen-printed or DTF logo, 180gsm cotton, unisex fit.', 850, 20,
    'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=1200&q=80');
  const corpShirtId = await upsertProduct('Corporate Branded Shirt', 'corporate-branded-shirt', 'apparel-wearable-branding', 'Embroidered logo, formal poplin cotton, tailored office-wear fit.', 1950, 20,
    'https://images.unsplash.com/photo-1534343133720-0c20dba3a360?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Branded Cap', 'branded-cap', 'apparel-wearable-branding', 'Embroidered front panel, adjustable strap, one-size.', 650, 30,
    'https://images.unsplash.com/photo-1691256676359-20e5c6d4bc92?auto=format&fit=crop&w=1200&q=80');
  const rollUpBannerId = await upsertProduct('Roll-Up Banner', 'roll-up-banner', 'large-format-environmental', 'Retractable stand, matte laminate finish — narrow (60x160cm) or wide (100x200cm), see Size below.', 7800, 1,
    '/static/img/products/roll-up-banner.jpg');
  await upsertProduct('Reception Wall Branding', 'reception-wall-branding', 'large-format-environmental', 'Vinyl wall graphics sized to your space.', 85000, 1,
    '/static/img/products/reception-wall-branding.jpg');
  await upsertProduct('Branded Event Tent / Gazebo (3x3m)', 'branded-event-tent-3x3', 'large-format-environmental', 'Printed canopy and valance, powder-coated pop-up frame — outdoor activations and market stalls.', 80000, 1,
    'https://images.unsplash.com/photo-1695393386569-cf141ff2c552?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Step-and-Repeat Backdrop', 'step-repeat-backdrop', 'large-format-environmental', 'Tension-fabric or PVC backdrop, repeat-logo print — press walls and stage backdrops.', 38000, 1,
    'https://images.unsplash.com/photo-1761225646548-bc92fea0dc72?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Floor Graphics', 'floor-graphics-decal', 'large-format-environmental', 'Anti-slip laminated vinyl, cut to any shape — per square metre.', 2800, 1,
    'https://images.unsplash.com/photo-1761704301183-4e82841ada75?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Window Graphics', 'window-graphics-decal', 'large-format-environmental', 'One-way-vision or opaque vinyl for storefront or office glass.', 3800, 1,
    'https://images.unsplash.com/photo-1647927397990-1a6a0f1819ce?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Vehicle Door Decals (pair)', 'vehicle-door-decals', 'vehicle-branding', 'Cut vinyl, reflective option available.', 6500, 1,
    'https://images.unsplash.com/photo-1735447814038-92e736f1c788?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Full Vehicle Wrap', 'full-vehicle-wrap', 'vehicle-branding', 'Full-body cast vinyl wrap, cutting-plotted graphics, 3–5 year exterior-grade laminate.', 85000, 1,
    'https://images.unsplash.com/photo-1777144635373-52419b0581bf?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Fleet Branding Package', 'fleet-branding-package', 'vehicle-branding', 'Volume-priced partial wrap for delivery or company fleets — consistent livery across every vehicle, 3+ minimum.', 32000, 3,
    'https://images.unsplash.com/photo-1737064899455-3bc3efc1ab97?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Motorbike / Boda Boda Branding', 'motorbike-branding', 'vehicle-branding', 'Panel decals for delivery and courier bikes, with matching rider-jacket branding available.', 8500, 1,
    'https://images.unsplash.com/photo-1777644043982-c72d83c91ab7?auto=format&fit=crop&w=1200&q=80');
  const bizCardId = await upsertProduct('Business Card (350gsm)', 'business-card-350gsm', 'print-marketing-materials', 'Matte, gloss, or ultra-gloss soft-touch lamination, double-sided.', 25, 100,
    'https://images.unsplash.com/photo-1718670013921-2f144aba173a?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('A4 Tri-Fold Corporate Brochure', 'a4-tri-fold-brochure', 'print-marketing-materials', 'Offset litho, colour-calibrated proofing, 6-panel tri-fold layout.', 45, 250,
    'https://images.unsplash.com/photo-1622223373286-4db475b3b9a7?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Corporate Letterhead & Stationery Set', 'letterhead-stationery-set', 'print-marketing-materials', 'Letterhead, envelopes, and compliment slips — offset litho, matched to your brand system.', 45, 200,
    'https://images.unsplash.com/photo-1612314578108-cdd41a612f2a?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Executive Notebook & Pen Set', 'executive-notebook-pen-set', 'promotional-merchandise', 'Hardcover leatherette notebook with embossed logo, paired pen.', 1850, 25,
    'https://images.unsplash.com/photo-1722929025573-3d461531ac4d?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Insulated Vacuum Flask', 'insulated-vacuum-flask', 'promotional-merchandise', 'Double-wall stainless steel, laser-engraved branding, matte finish.', 1650, 25,
    'https://images.unsplash.com/photo-1605608800007-3b5615fd5d27?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Branded Tote Bag', 'branded-tote-bag', 'promotional-merchandise', 'Cotton or non-woven, screen-printed or embroidered.', 350, 100,
    'https://images.unsplash.com/photo-1574365569389-a10d488ca3fb?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Luxury Gift Box', 'luxury-gift-box', 'packaging-branded-bags', 'Rigid board, foil-stamped branding.', 950, 50,
    '/static/img/products/luxury-gift-box.jpg');
  await upsertProduct('Branded Packaging Pouch', 'branded-packaging-pouch', 'packaging-branded-bags', 'Stand-up flexible pouch, matte or gloss finish, food-safe options.', 45, 500,
    'https://images.unsplash.com/photo-1706881811901-1d068b6f6fb5?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Exhibition Stand (3x3m)', 'exhibition-stand-3x3', 'event-branding-activation', 'Modular backdrop with branded panels.', 65000, 1,
    'https://images.unsplash.com/photo-1761195689615-9469b65dac01?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Brand Activation & Experiential Setup', 'brand-activation-experiential', 'event-branding-activation', 'Full on-site activation — branded booth, staff uniforms, and an interactive brand experience for expos or public activations.', 95000, 1,
    'https://images.unsplash.com/photo-1762028892701-692dc360db08?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Company Profile & Brand Guidelines', 'company-profile-brand-guidelines', 'graphic-design-creative', 'Full brand identity system + usage guide.', 85000, 1,
    'https://images.unsplash.com/photo-1645658043538-fc2bb1702cfe?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Logo & Brand Identity Design', 'logo-brand-identity-design', 'graphic-design-creative', 'Logo suite, colour system, and typography rules — the foundation before a full Brand Guidelines document.', 65000, 1,
    'https://images.unsplash.com/photo-1748326650737-33500fdfda30?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Custom Illustration & Artwork', 'custom-illustration-artwork', 'graphic-design-creative', 'Bespoke illustration for packaging, murals, merchandise, or campaign artwork.', 15000, 1,
    'https://images.unsplash.com/photo-1649331593153-7575e5cd3c6e?auto=format&fit=crop&w=1200&q=80');

  // ── v6 — illustrative service line items for the 3 brand-new capability-
  // statement divisions (I, J, K). These are TrioCraft's own strategy/
  // coordination/digital services rather than physically-produced goods, so
  // "quantity" reads as engagements/sessions and pricing as a starting
  // (from-KES) figure — quotable and orderable through the same Custom Brief
  // flow as everything else. ──
  await upsertProduct('Brand Positioning & Campaign Strategy Workshop', 'brand-positioning-strategy-workshop', 'brand-strategy-consultation',
    'Facilitated positioning, messaging, and campaign-execution workshop — includes a rebrand/identity-refresh assessment and a political or corporate advisory session where relevant.', 120000, 1,
    'https://images.unsplash.com/photo-1758873268998-2f77c2d38862?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('On-Site Production Project Management', 'onsite-production-project-management', 'project-management-execution',
    'A dedicated TrioCraft project manager coordinating vendor sourcing, QA/QC, and production supervision for multi-vendor or multi-site rollouts — day-rate engagement.', 55000, 1,
    'https://images.unsplash.com/photo-1742112125567-3e8967bad60f?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Digital Brand Template Pack', 'digital-brand-template-pack', 'digital-innovation',
    'Editable social, presentation, and signage templates built to your Brand Vault — the starting point for self-serve digital assets between full design engagements.', 24000, 1,
    'https://images.unsplash.com/photo-1639170952854-16636715af61?auto=format&fit=crop&w=1200&q=80');
  await upsertProduct('Social Media Content Design Pack', 'social-media-content-pack', 'digital-innovation',
    "A month of on-brand social templates — posts, stories, and carousels — ready to schedule.", 32000, 1,
    'https://images.unsplash.com/photo-1611926653458-09294b3142bf?auto=format&fit=crop&w=1200&q=80');

  // ── Print pricing engine demo data — options/values + quantity tiers on 3
  // representative products (a merch item, an apparel item, a print item) so
  // the configurator and volume pricing are visible out of the box. ──
  await upsertOptionGroup(mugId, 'Print Style', [
    { label: 'Wraparound Full-Colour', delta: 0, isDefault: true },
    { label: 'Single Logo (One Side)', delta: -80 },
    { label: 'Two-Tone Colour-Change (Magic Mug)', delta: 220 },
  ]);
  await upsertQuantityTiers(mugId, [
    { min: 50, max: 99, price: 650 },
    { min: 100, max: 249, price: 590 },
    { min: 250, max: null, price: 520 },
  ]);

  await upsertOptionGroup(poloId, 'Branding Method', [
    { label: 'Embroidered Logo (Left Chest)', delta: 0, isDefault: true },
    { label: 'Embroidered Logo + Back Print', delta: 350 },
    { label: 'Screen-Printed Logo', delta: -150 },
  ]);
  await upsertOptionGroup(poloId, 'Size', [
    { label: 'S – XL', delta: 0, isDefault: true },
    { label: '2XL – 3XL', delta: 100 },
  ]);
  await upsertQuantityTiers(poloId, [
    { min: 20, max: 49, price: 1450 },
    { min: 50, max: 99, price: 1320 },
    { min: 100, max: null, price: 1180 },
  ]);

  // v7 — Size variants on the two new apparel items, matching the polo's
  // existing pattern, and a Size variant on the Roll-Up Banner so "narrow vs
  // wide" is a single accurately-photographed product rather than two SKUs
  // needing two different banner-stand photos we don't have.
  await upsertOptionGroup(roundNeckId, 'Size', [
    { label: 'S – XL', delta: 0, isDefault: true },
    { label: '2XL – 3XL', delta: 60 },
  ]);
  await upsertOptionGroup(corpShirtId, 'Size', [
    { label: 'S – XL', delta: 0, isDefault: true },
    { label: '2XL – 3XL', delta: 100 },
  ]);
  await upsertOptionGroup(rollUpBannerId, 'Size', [
    { label: 'Narrow (60x160cm)', delta: 0, isDefault: true },
    { label: 'Wide (100x200cm)', delta: 4200 },
  ]);

  await upsertOptionGroup(bizCardId, 'Paper Stock', [
    { label: '300gsm Matte', delta: 0, isDefault: true },
    { label: '350gsm Matte', delta: 5 },
    { label: '350gsm Gloss', delta: 5 },
    { label: '400gsm Suede (Soft-Touch)', delta: 15 },
  ]);
  await upsertOptionGroup(bizCardId, 'Finishing', [
    { label: 'None', delta: 0, isDefault: true },
    { label: 'Spot UV', delta: 8 },
    { label: 'Foil Stamping', delta: 12 },
  ]);
  await upsertQuantityTiers(bizCardId, [
    { min: 100, max: 249, price: 25 },
    { min: 250, max: 499, price: 19 },
    { min: 500, max: null, price: 14 },
  ]);

  // ── Accounts ──
  // NOTE: change these passwords immediately after first deploy (see README).
  await upsertUser('TrioCraft Admin', 'admin@triocraft.org', 'ChangeMe!2026', 'admin', 'TrioCraft Brands Ltd');
  await upsertUser('Demo Vendor — Stitchline', 'vendor@triocraft.org', 'ChangeMe!2026', 'vendor', 'Stitchline Ltd');
  await upsertUser('Demo Client — Savanna Coffee', 'client@triocraft.org', 'ChangeMe!2026', 'client', 'Savanna Coffee');
  // Verified corporate account demo — exercises the LPO/Net-terms checkout
  // path and invoice generation without needing a second manual admin step.
  await upsertUser('Demo Corporate — Acme Distributors', 'corporate@triocraft.org', 'ChangeMe!2026', 'client', 'Acme Distributors Ltd', {
    accountType: 'corporate', corporateVerified: true, creditTermsDays: 30, kraPin: 'P000111222X',
  });

  // ── FX rates (multi-currency display) — illustrative starting values, NOT
  // a live feed. Update these periodically; see lib/currency.js. ──
  await upsertFxRate('UGX', 0.033); // ~1 KES ≈ 30 UGX
  await upsertFxRate('TZS', 0.055); // ~1 KES ≈ 18 TZS
  await upsertFxRate('RWF', 0.115); // ~1 KES ≈ 8.7 RWF

  // ── Blog / Resources: the Production Marketplace guide ──
  await upsertPost({
    slug: 'production-marketplace-guide',
    title: "How to Start a Branded Merchandise Business in Kenya Using TrioCraft's Production Marketplace",
    eyebrow: 'Getting Started',
    excerpt: "Sell branded mugs, tees, and merch without owning a printer or holding stock — here's the step-by-step.",
    meta_description: "Want to sell branded mugs, tees, and merch without owning a printer or holding stock? Here's how TrioCraft's Production Marketplace makes it possible — step by step.",
    read_minutes: 7,
    body_html: `
<p class="lede">If you've never heard of it, a <strong>production marketplace</strong> is a business model where you put your brand or design on products like mugs, t-shirts, hoodies, caps, and tote bags — and a vetted production partner only manufactures and delivers the item after someone actually orders it. You never touch a printer, a heat press, or a delivery van.</p>
<p>No stock sitting in your bedroom. No packing boxes at midnight. No trips to a courier office.</p>
<p>This post walks you through exactly how to set this up using TrioCraft's Production Marketplace, step by step, in the simplest way possible. By the end, you'll have your first branded product ready to sell — or ready to hand out to your own staff, church, school, or campaign team.</p>
<p>Let's get into it.</p>

<h2>Why TrioCraft and not a random printer down the road?</h2>
<p>There are plenty of ways to get something printed in Nairobi, but TrioCraft's Production Marketplace is built for people who want to do this properly, for three reasons:</p>
<ul>
  <li><strong>It's built on a vetted network, not a gamble.</strong> Every provider in the marketplace — from apparel partners like Stitchline Ltd to merchandise houses like Merch Kenya — is TrioCraft-vetted and Pantone-matched, so your brand colours come out right every time, not "close enough."</li>
  <li><strong>It's one platform for everything.</strong> Corporate branding, apparel, packaging, promotional merchandise, signage, vehicle branding, event branding — it's all in one Product Catalogue instead of five different vendors with five different WhatsApp numbers.</li>
  <li><strong>You get design, quality assurance, and coordination included.</strong> TrioCraft doesn't just connect you to a printer and disappear. The team manages the full lifecycle — brief, design, provider assignment, quality checks, delivery — so what lands on your desk actually matches the mockup you approved.</li>
</ul>
<p>You're not manufacturing anything yourself. TrioCraft connects you to its curated production network — what the team internally calls the "Airbnb of branding" — and handles the craftsmanship end to end.</p>

<h2>What you need before you start</h2>
<ul>
  <li><strong>A brand you want on the product</strong> — your logo, colours, or even just a name and an idea. This could be a business, a church, a school, a SACCO, a political campaign, or a personal side hustle.</li>
  <li><strong>A reason to print</strong> — internal use (staff uniforms, corporate gifts, event merch) or resale (a product line you plan to sell). Both work here.</li>
</ul>
<p>That's really it. You don't need a warehouse or upfront capital tied up in stock. With most items, you're only committing once you place an order.</p>

<h2>Step 1: Get access to the Production Marketplace</h2>
<p>Create a free account or sign in through TrioCraft Interactive, the client portal, to get access to the Production Marketplace. If you're new, the team will walk you through a short onboarding conversation about what you're branding and who it's for.</p>

<h2>Step 2: Set up your Brand Vault</h2>
<p>This is the step most beginners skip — and it's the one that makes everything after it faster. Upload your logo, brand colours, fonts, and any guidelines into your <strong>Brand Vault</strong>. Once it's verified, every product you order afterwards pulls from the same approved assets.</p>
<p>If you don't have brand guidelines yet, say so — TrioCraft's design team can build them as part of onboarding.</p>

<h2>Step 3: Pick your first product from the Catalogue</h2>
<p>Open <strong>Product Catalogue</strong> on the marketplace dashboard: graphic design & creative, apparel & wearable branding, large format & environmental branding, vehicle branding, print & marketing materials, promotional merchandise, packaging & branded bags, and event branding & activation — plus brand strategy, project management, and digital services for anything beyond a physical product.</p>
<p>For your first order, pick something simple — a mug, a t-shirt, or a roll-up banner. Each product lists TrioCraft's vetted print providers for that category. Providers are auto-assigned by product type and capacity, but you can request a specific vendor.</p>

<h2>Step 4: Get your design in place</h2>
<p>Here's the part nobody tells beginners: you don't need to be a designer to do this properly. Use a ready <strong>Design Template</strong> built by TrioCraft's in-house creative team, or submit a <strong>Custom Brief</strong> for anything that needs a genuinely original look. Either way, you're getting agency-grade design, not a stock graphic stretched onto a mug.</p>

<h2>Step 5: Approve your mockup</h2>
<p>The platform generates a live, Pantone-matched mockup so you can see exactly how it will look before anything goes into production. Take your time here — a logo that's too small or off-centre is the most common reason a first order doesn't land the way a client expected.</p>

<blockquote>"Never compete on price — compete on creativity, quality, and reliability."</blockquote>

<h2>Step 6: Set your quantity (and price, if reselling)</h2>
<p>For internal use, you're simply confirming quantity and delivery details. If you're building a product line to resell, the marketplace shows the base unit cost from your chosen provider — set your selling price above that, with enough margin to reflect the quality you're delivering.</p>

<h2>Step 7: Place your order and track it</h2>
<p>Confirm the order and it moves straight into <strong>Active Orders</strong>, where you track production status in real time — no chasing a vendor over WhatsApp.</p>

<h2>What happens after you place the order</h2>
<p>TrioCraft sends the job to the assigned provider, tracks it through production, runs quality checks against your Brand Vault standards, and coordinates delivery. Your job is just reviewing the delivery, keeping your Brand Vault current, and flagging anything that doesn't match what you approved.</p>

<h2>A few tips before you go all in</h2>
<ul>
  <li>Start with a small pilot — 3–5 items across categories — before a full rollout.</li>
  <li>Keep your Brand Vault current so every future order stays consistent.</li>
  <li>Use TrioCraft's design team for anything client-facing; templates suit fast internal items.</li>
  <li>Reuse a strong design across categories — one brand mark, many products.</li>
  <li>Refresh designs for campaigns, events, or seasons to keep things current.</li>
</ul>

<p>Building a branded product line — or simply getting your organisation properly branded — doesn't have to mean owning equipment, chasing five vendors, or gambling on print quality. TrioCraft's Production Marketplace removes exactly that friction: one vetted network, one Brand Vault, one platform to design, order, and track everything from a business card to a fleet wrap.</p>
`.trim(),
  });

  console.log('✓ Database seeded: 11-division category taxonomy (A–K), providers, products, demo accounts, and the Production Marketplace blog post.');
  console.log('  Admin login:     admin@triocraft.org     / ChangeMe!2026');
  console.log('  Vendor login:    vendor@triocraft.org    / ChangeMe!2026');
  console.log('  Client login:    client@triocraft.org    / ChangeMe!2026');
  console.log('  Corporate login: corporate@triocraft.org / ChangeMe!2026  (verified, Net 30 LPO terms)');
  console.log('  ⚠ Change these passwords before going live.');
}

main()
  .then(() => db.pool.end())
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  });
