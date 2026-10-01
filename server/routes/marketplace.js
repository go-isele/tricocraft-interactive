const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/db');
const { requireRole } = require('../middleware/auth');
const { findOrCreateGuestClient } = require('../lib/guest');
const { notify } = require('../lib/mailer');
const { getProductPricing, computeOrderPricing } = require('../lib/pricing');
const { runPreflight } = require('../lib/preflight');
const { DELIVERY_METHODS } = require('../lib/delivery');
const whatsapp = require('../lib/whatsapp');
const currency = require('../lib/currency');
const crossBorder = require('../lib/cross-border');
const { structureBrief } = require('../lib/ai-brief');
const { generateInvoicePdf } = require('../lib/invoice-pdf');
const { STATUS_PROGRESS, STATUS_LABELS, resolveOrderCategory: resolveOrderCategoryBase, addTimeline: addTimelineBase } = require('../lib/order-status');

const resolveOrderCategory = (order) => resolveOrderCategoryBase(db, order);
const addTimeline = (orderId, stage, notes) => addTimelineBase(db, orderId, stage, notes);

const uploadDir = path.join(__dirname, '..', 'uploads', 'brand-vault');
fs.mkdirSync(uploadDir, { recursive: true });

// v5 — composited logo-on-product previews from the live canvas mockup
// editor arrive as a base64 PNG data URL in the add-to-cart / custom-brief
// POST body, not as a multipart file — the canvas already did the
// compositing client-side, so this just persists the result.
const mockupDir = path.join(__dirname, '..', 'uploads', 'mockups');
fs.mkdirSync(mockupDir, { recursive: true });
function saveMockupDataUrl(dataUrl, userId) {
  if (!dataUrl || !dataUrl.startsWith('data:image/png;base64,')) return null;
  const base64 = dataUrl.slice('data:image/png;base64,'.length);
  // A sane cap — this is a preview composite, not an artwork upload; 8MB of
  // base64 PNG is already a very large canvas export.
  if (base64.length > 8 * 1024 * 1024) return null;
  const filename = `${userId || 'guest'}-${Date.now()}-mockup.png`;
  try {
    fs.writeFileSync(path.join(mockupDir, filename), Buffer.from(base64, 'base64'));
    return filename;
  } catch (e) {
    console.error('[mockup-editor] failed to save preview:', e.message);
    return null;
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const stamp = Date.now();
      cb(null, `${req.session.user.id}-${stamp}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// LPO documents (Local Purchase Orders, for the B2B credit checkout path) —
// kept in a separate upload directory from Brand Vault assets since they're
// procurement paperwork, not artwork.
const lpoDir = path.join(__dirname, '..', 'uploads', 'lpo');
fs.mkdirSync(lpoDir, { recursive: true });
const uploadLpo = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, lpoDir),
    filename: (req, file, cb) => {
      const stamp = Date.now();
      const who = req.session.user ? req.session.user.id : 'guest';
      cb(null, `${who}-${stamp}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function readDeliveryFields(body) {
  const method = DELIVERY_METHODS.find((m) => m.value === body.delivery_method) ? body.delivery_method : null;
  const isCrossBorder = method === 'cross_border_eac';
  const destCountry = isCrossBorder && crossBorder.EAC_COUNTRIES.some((c) => c.code === body.delivery_country) ? body.delivery_country : null;
  const crossBorderEstimate = destCountry ? crossBorder.estimateCrossBorderCost(destCountry, Number(body.parcel_weight_kg) || 1) : null;
  return {
    delivery_method: method,
    delivery_partner: body.delivery_partner || (isCrossBorder ? (destCountry ? crossBorder.CROSS_BORDER_PARTNERS[0] : null) : null),
    delivery_town: body.delivery_town || null,
    delivery_address: body.delivery_address || null,
    delivery_country: destCountry,
    cross_border_cost_kes: crossBorderEstimate ? crossBorderEstimate.costKes : null,
  };
}

// Only a verified corporate account may check out on credit (Net 30/60/90 +
// LPO) instead of paying up front — this can't be self-declared by a guest.
function readCreditFields(body, sessionUser) {
  const isVerifiedCorporate = !!(sessionUser && sessionUser.accountType === 'corporate' && sessionUser.corporateVerified);
  const allowedTerms = { 30: ['net30'], 60: ['net30', 'net60'], 90: ['net30', 'net60', 'net90'] };
  const allowed = isVerifiedCorporate ? (allowedTerms[sessionUser.creditTermsDays] || []) : [];
  const requestedTerms = body.payment_terms;
  const paymentTerms = allowed.includes(requestedTerms) ? requestedTerms : 'due_on_delivery';
  return {
    payment_terms: paymentTerms,
    lpo_number: paymentTerms !== 'due_on_delivery' ? (body.lpo_number || null) : null,
  };
}

function sessionUserFromRow(user) {
  return {
    id: user.id, name: user.name, email: user.email, role: user.role, company: user.company, phone: user.phone,
    accountType: user.account_type, corporateVerified: !!user.corporate_verified,
    creditTermsDays: user.credit_terms_days, kraPin: user.kra_pin,
  };
}

module.exports = function (app) {
  const router = express.Router();

  // ── Display currency (KES stays the one transaction currency — see lib/currency.js) ──
  router.post('/api/marketplace/currency', (req, res) => {
    const code = req.body.currency;
    if (currency.SUPPORTED_CURRENCIES.some((c) => c.code === code)) req.session.currency = code;
    res.json({ currency: req.session.currency || 'KES' });
  });

  // ── Catalogue ──
  router.get('/api/marketplace/products', async (req, res) => {
    const categories = await db.all('SELECT * FROM categories ORDER BY sort_order');
    const activeCat = req.query.category || null;
    const products = activeCat
      ? await db.all(`SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p
                    JOIN categories c ON c.id = p.category_id WHERE c.slug = ? AND p.active = 1 ORDER BY p.name`, [activeCat])
      : await db.all(`SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p
                    JOIN categories c ON c.id = p.category_id WHERE p.active = 1 ORDER BY c.sort_order, p.name`);
    res.json({ categories, products, activeCat });
  });

  router.get('/api/marketplace/products/:slug', async (req, res) => {
    const product = await db.get(`SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p
                                 JOIN categories c ON c.id = p.category_id WHERE p.slug = ?`, [req.params.slug]);
    if (!product) return res.status(404).json({ error: 'not_found', message: 'Product not found.' });
    const providers = await db.all('SELECT * FROM providers WHERE category_id = ?', [product.category_id]);
    const pricing = await getProductPricing(product.id);
    res.json({ product, providers, pricing });
  });

  // Live price recalculation for the product configurator (quantity/option
  // changes) without a full page reload — thin wrapper around the same
  // server-side computeOrderPricing() used at add-to-cart time, so tampering
  // with option IDs client-side can't change the price actually charged.
  router.post('/api/marketplace/products/:slug/price', async (req, res) => {
    const product = await db.get('SELECT id FROM products WHERE slug = ?', [req.params.slug]);
    if (!product) return res.status(404).json({ error: 'not_found' });
    const qty = Math.max(1, Number(req.body.quantity) || 1);
    const optionValueIds = Array.isArray(req.body.optionValueIds) ? req.body.optionValueIds.map(Number).filter(Boolean) : [];
    try {
      const priced = await computeOrderPricing(product.id, qty, optionValueIds);
      res.json(priced);
    } catch (err) {
      res.status(400).json({ error: 'pricing_error', message: err.message });
    }
  });

  // ── Brand Vault ──
  router.get('/api/marketplace/brand-vault', requireRole('client', 'admin'), async (req, res) => {
    const assets = await db.all('SELECT * FROM brand_assets WHERE user_id = ? ORDER BY created_at DESC', [req.session.user.id]);
    res.json({ assets });
  });

  router.post('/api/marketplace/brand-vault/upload', requireRole('client', 'admin'), upload.single('file'), async (req, res) => {
    const { asset_type, label } = req.body;
    if (!req.file) return res.status(400).json({ error: 'file_required' });
    const filePath = path.join(uploadDir, req.file.filename);
    const preflight = runPreflight(filePath, req.file.originalname);
    const info = await db.run(
      `INSERT INTO brand_assets (user_id, asset_type, label, filename, verified, width_px, height_px, likely_color_space, preflight_notes)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      [
        req.session.user.id, asset_type || 'other', label || req.file.originalname, req.file.filename,
        preflight.widthPx, preflight.heightPx, preflight.colorSpace, JSON.stringify(preflight.warnings),
      ]
    );
    const asset = await db.get('SELECT * FROM brand_assets WHERE id = ?', [info.lastInsertRowid]);
    res.status(201).json({ asset });
  });

  router.post('/api/marketplace/brand-vault/color', requireRole('client', 'admin'), async (req, res) => {
    const { label, hex } = req.body;
    if (!hex) return res.status(400).json({ error: 'hex_required' });
    const info = await db.run(
      `INSERT INTO brand_assets (user_id, asset_type, label, value, verified) VALUES (?, 'color_palette', ?, ?, 1)`,
      [req.session.user.id, label || 'Brand color', hex]
    );
    const asset = await db.get('SELECT * FROM brand_assets WHERE id = ?', [info.lastInsertRowid]);
    res.status(201).json({ asset });
  });

  router.delete('/api/marketplace/brand-vault/:id', requireRole('client', 'admin'), async (req, res) => {
    const asset = await db.get('SELECT * FROM brand_assets WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
    if (asset) {
      if (asset.filename) {
        const p = path.join(uploadDir, asset.filename);
        fs.existsSync(p) && fs.unlinkSync(p);
      }
      await db.run('DELETE FROM brand_assets WHERE id = ?', [asset.id]);
    }
    res.json({ ok: true });
  });

  // ── Cart (session-based; each item snapshots its computed price at add-time) ──
  async function getCartItems(req) {
    const cart = req.session.cart || [];
    const items = await Promise.all(cart.map(async (item) => {
      const product = await db.get('SELECT * FROM products WHERE id = ?', [item.productId]);
      return product ? { ...item, product } : null;
    }));
    return items.filter(Boolean);
  }

  router.get('/api/marketplace/cart', async (req, res) => {
    const items = await getCartItems(req);
    const total = items.reduce((sum, i) => sum + i.lineTotal, 0);
    const user = req.session.user;
    const canUseCredit = !!(user && user.accountType === 'corporate' && user.corporateVerified);
    const waLink = items.length ? whatsapp.buildDeepLink(whatsapp.cartMessage(items, total, req.session.currency || 'KES')) : null;
    res.json({
      items, total, deliveryMethods: DELIVERY_METHODS,
      eacCountries: crossBorder.EAC_COUNTRIES, crossBorderPartners: crossBorder.CROSS_BORDER_PARTNERS,
      canUseCredit, creditTermsDays: user ? user.creditTermsDays : null, waLink,
    });
  });

  router.post('/api/marketplace/cart/add', async (req, res) => {
    const { productId, quantity, brief, mockup_data } = req.body;
    const pid = Number(productId);
    const qty = Math.max(1, Number(quantity) || 1);

    // Pull the chosen value ID for each of this product's option groups —
    // client sends them as { optionValueIds: { [optionId]: valueId } } or as
    // opt_<optionId> form fields (kept for backward-compat with multipart posts).
    const { options } = await getProductPricing(pid);
    const optMap = req.body.optionValueIds || {};
    const optionValueIds = options
      .map((opt) => Number(optMap[opt.id] ?? req.body['opt_' + opt.id]))
      .filter(Boolean);

    let priced;
    try {
      priced = await computeOrderPricing(pid, qty, optionValueIds);
    } catch (err) {
      return res.status(400).json({ error: 'pricing_error', message: err.message });
    }
    const mockupFilename = saveMockupDataUrl(mockup_data, req.session.user && req.session.user.id);

    req.session.cart = req.session.cart || [];
    req.session.cart.push({
      productId: pid, quantity: qty, brief: brief || '',
      optionValueIds, selections: priced.selections,
      unitPrice: priced.unitPrice, lineTotal: priced.lineTotal, tierApplied: priced.tierApplied,
      mockupFilename,
    });
    res.status(201).json({ cartCount: req.session.cart.length });
  });

  router.post('/api/marketplace/cart/remove/:index', (req, res) => {
    const idx = Number(req.params.index);
    if (req.session.cart) req.session.cart.splice(idx, 1);
    res.json({ cartCount: (req.session.cart || []).length });
  });

  // Guests can check out without an account first — we quietly find-or-create
  // a client record from the details they give us and log them in, so the
  // order has an owner and they land straight on their own order tracking.
  // A verified corporate account may instead check out on Net 30/60/90 terms
  // against an LPO — see readCreditFields().
  router.post('/api/marketplace/cart/checkout', uploadLpo.single('lpo_document'), async (req, res) => {
    const items = await getCartItems(req);
    if (!items.length) return res.status(400).json({ error: 'empty_cart', message: 'Your cart is empty.' });

    if (!req.session.user) {
      const { guest_name, guest_email, guest_company, guest_phone } = req.body;
      if (!guest_name || !guest_email) {
        return res.status(400).json({ error: 'guest_details_required', message: 'Please give us your name and email so we can send the quotation.' });
      }
      const user = await findOrCreateGuestClient({ name: guest_name, email: guest_email, company: guest_company, phone: guest_phone });
      req.session.user = sessionUserFromRow(user);
    }

    const delivery = readDeliveryFields(req.body);
    const credit = readCreditFields(req.body, req.session.user);
    const displayCurrency = req.session.currency || 'KES';

    const insertOrderSql = `
      INSERT INTO orders (client_id, product_id, title, quantity, status, payment_status, progress, brief,
                            calculated_unit_price, options_json, delivery_method, delivery_partner, delivery_town,
                            delivery_address, delivery_country, cross_border_cost_kes,
                            payment_terms, lpo_number, lpo_filename, currency, mockup_filename)
       VALUES (?, ?, ?, ?, 'new', 'unpaid', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const createdIds = [];
    for (const item of items) {
      const info = await db.run(insertOrderSql, [
        req.session.user.id, item.product.id, item.product.name, item.quantity,
        STATUS_PROGRESS.new, item.brief || null,
        item.unitPrice, JSON.stringify(item.selections || []),
        delivery.delivery_method, delivery.delivery_partner, delivery.delivery_town, delivery.delivery_address,
        delivery.delivery_country, delivery.cross_border_cost_kes,
        credit.payment_terms, credit.lpo_number, req.file ? req.file.filename : null, displayCurrency,
        item.mockupFilename || null,
      ]);
      await addTimeline(info.lastInsertRowid, 'Order Submitted', 'Received through the Production Marketplace.');
      if (credit.payment_terms !== 'due_on_delivery') {
        await addTimeline(info.lastInsertRowid, 'LPO Received', `Checked out on ${credit.payment_terms.replace('net', 'Net ')} terms${credit.lpo_number ? ' · LPO No: ' + credit.lpo_number : ''}. Awaiting admin verification and invoicing.`);
      }
      createdIds.push(info.lastInsertRowid);
    }
    req.session.cart = [];

    const creditNote = credit.payment_terms !== 'due_on_delivery'
      ? `\n\nPayment Terms: ${credit.payment_terms.replace('net', 'Net ')} (LPO No: ${credit.lpo_number || 'not given'}${req.file ? ', document attached' : ''})`
      : '';
    const crossBorderNote = delivery.delivery_country
      ? `\n\nCross-border delivery to ${crossBorder.EAC_COUNTRIES.find((c) => c.code === delivery.delivery_country)?.name || delivery.delivery_country} — estimated logistics cost KES ${(delivery.cross_border_cost_kes || 0).toLocaleString()} (confirm with logistics before dispatch).`
      : '';

    await notify({
      subject: `New Production Marketplace order — ${req.session.user.name}`,
      replyTo: req.session.user.email,
      text: `${req.session.user.name} (${req.session.user.email}${req.session.user.company ? ', ' + req.session.user.company : ''}) submitted ${items.length} order(s):\n\n` +
        items.map((i) => {
          const opts = (i.selections || []).map((s) => `${s.optionName}: ${s.valueLabel}`).join(', ');
          return `- ${i.product.name} × ${i.quantity} @ KES ${i.unitPrice}/unit${opts ? ' (' + opts + ')' : ''}${i.brief ? ' — "' + i.brief + '"' : ''}`;
        }).join('\n') +
        `\n\nDelivery: ${delivery.delivery_method || 'not specified'}${delivery.delivery_partner ? ' via ' + delivery.delivery_partner : ''}` +
        creditNote + crossBorderNote,
    });

    res.status(201).json({ orderIds: createdIds });
  });

  // ── Custom brief (no catalogue product) — open to guests ──
  router.get('/api/marketplace/custom-brief/meta', async (req, res) => {
    const categories = await db.all('SELECT * FROM categories ORDER BY sort_order');
    const user = req.session.user;
    const canUseCredit = !!(user && user.accountType === 'corporate' && user.corporateVerified);
    res.json({
      categories, deliveryMethods: DELIVERY_METHODS,
      eacCountries: crossBorder.EAC_COUNTRIES, crossBorderPartners: crossBorder.CROSS_BORDER_PARTNERS,
      canUseCredit, creditTermsDays: user ? user.creditTermsDays : null,
    });
  });

  // AJAX: turns free-text into a structured brief (category/quantity/dimensions
  // guess, colour-mode + placement notes) — see lib/ai-brief.js. Real Claude
  // API call if ANTHROPIC_API_KEY is set, heuristic fallback otherwise.
  router.post('/api/marketplace/custom-brief/ai-assist', async (req, res) => {
    const { description } = req.body;
    if (!description || !description.trim()) return res.status(400).json({ error: 'description_required' });
    const structured = await structureBrief(description);
    res.json(structured);
  });

  router.post('/api/marketplace/custom-brief', uploadLpo.single('lpo_document'), async (req, res) => {
    const { title, quantity, brief, deadline, guest_name, guest_email, guest_company, guest_phone, ai_brief_json, category_ref } = req.body;

    if (!req.session.user) {
      if (!guest_name || !guest_email) {
        return res.status(400).json({ error: 'guest_details_required', message: 'Please give us your name and email so our design team can reach you.' });
      }
      const user = await findOrCreateGuestClient({ name: guest_name, email: guest_email, company: guest_company, phone: guest_phone });
      req.session.user = sessionUserFromRow(user);
    }

    const delivery = readDeliveryFields(req.body);
    const credit = readCreditFields(req.body, req.session.user);
    const displayCurrency = req.session.currency || 'KES';
    // v6 — a Custom Brief order has no product_id (so no products.category_id
    // to derive a Service Category from for invoicing/job cards) — persist
    // whatever the client picked in the form's Category dropdown instead.
    const briefCategory = category_ref ? await db.get('SELECT id FROM categories WHERE slug = ?', [category_ref]) : null;

    const info = await db.run(
      `INSERT INTO orders (client_id, product_id, title, quantity, status, payment_status, progress, brief, deadline,
                            delivery_method, delivery_partner, delivery_town, delivery_address, delivery_country, cross_border_cost_kes,
                            payment_terms, lpo_number, lpo_filename, currency, ai_brief_json, category_id)
       VALUES (?, NULL, ?, ?, 'new', 'unpaid', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.user.id, title, Math.max(1, Number(quantity) || 1), STATUS_PROGRESS.new, brief || null, deadline || null,
        delivery.delivery_method, delivery.delivery_partner, delivery.delivery_town, delivery.delivery_address,
        delivery.delivery_country, delivery.cross_border_cost_kes,
        credit.payment_terms, credit.lpo_number, req.file ? req.file.filename : null, displayCurrency,
        ai_brief_json || null, briefCategory ? briefCategory.id : null,
      ]
    );
    await addTimeline(info.lastInsertRowid, 'Custom Brief Submitted', 'Awaiting design team review and quotation.');
    if (ai_brief_json) await addTimeline(info.lastInsertRowid, 'AI-Assisted Brief', 'Client used AI Assist to structure this brief — see the AI-Structured Brief panel.');

    await notify({
      subject: `New Custom Brief — ${title}`,
      replyTo: req.session.user.email,
      text: `${req.session.user.name} (${req.session.user.email}${req.session.user.company ? ', ' + req.session.user.company : ''}) submitted a custom brief:\n\nTitle: ${title}\nQuantity: ${quantity}\nDeadline: ${deadline || '—'}\n\nBrief:\n${brief}`,
    });

    res.status(201).json({ orderId: info.lastInsertRowid });
  });

  // ── Orders (client view) ──
  router.get('/api/marketplace/orders', requireRole('client', 'admin'), async (req, res) => {
    const orders = await db.all(
      `SELECT o.*, p.name AS provider_name FROM orders o LEFT JOIN providers p ON p.id = o.provider_id
       WHERE o.client_id = ? ORDER BY o.created_at DESC`,
      [req.session.user.id]
    );
    const active = orders.filter((o) => !['completed', 'cancelled'].includes(o.status));
    const history = orders.filter((o) => ['completed', 'cancelled'].includes(o.status));
    res.json({ active, history, STATUS_LABELS });
  });

  router.get('/api/marketplace/orders/:id', requireRole('client', 'admin', 'vendor'), async (req, res) => {
    const order = await db.get(
      `SELECT o.*, p.name AS provider_name, pr.name AS product_name FROM orders o
       LEFT JOIN providers p ON p.id = o.provider_id LEFT JOIN products pr ON pr.id = o.product_id
       WHERE o.id = ?`,
      [req.params.id]
    );
    if (!order) return res.status(404).json({ error: 'not_found', message: 'Order not found.' });
    if (req.session.user.role === 'client' && order.client_id !== req.session.user.id) {
      return res.status(403).json({ error: 'forbidden', message: 'This order belongs to another client.' });
    }
    const timeline = await db.all('SELECT * FROM order_timeline WHERE order_id = ? ORDER BY created_at ASC', [order.id]);
    const payments = await db.all('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC', [order.id]);
    const options = order.options_json ? JSON.parse(order.options_json) : [];
    const aiBrief = order.ai_brief_json ? JSON.parse(order.ai_brief_json) : null;
    const waLink = whatsapp.buildDeepLink(whatsapp.orderMessage(order));
    res.json({
      order, timeline, payments, options, aiBrief,
      category: await resolveOrderCategory(order),
      STATUS_LABELS, DELIVERY_METHODS, eacCountries: crossBorder.EAC_COUNTRIES, waLink,
    });
  });

  // Proforma (pre-invoicing) or tax invoice (once formally invoiced) as a
  // real downloadable PDF — see lib/invoice-pdf.js.
  router.get('/api/marketplace/orders/:id/invoice.pdf', requireRole('client', 'admin', 'vendor'), async (req, res) => {
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'not_found', message: 'Order not found.' });
    if (req.session.user.role === 'client' && order.client_id !== req.session.user.id) {
      return res.status(403).json({ error: 'forbidden', message: 'This order belongs to another client.' });
    }
    const client = await db.get('SELECT * FROM users WHERE id = ?', [order.client_id]);
    const kind = order.invoice_status === 'not_invoiced' ? 'proforma' : 'tax_invoice';
    const fiscal = {
      invoiceNumber: order.etims_invoice_number,
      controlNumber: order.etims_control_number,
      simulated: !!order.etims_simulated,
      qrDataUrl: order.etims_qr_data_url,
    };
    const category = await resolveOrderCategory(order);
    generateInvoicePdf({ order, client, kind, fiscal, category })
      .then((buffer) => {
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', `inline; filename="triocraft-order-${order.id}-${kind}.pdf"`);
        res.send(buffer);
      })
      .catch((err) => {
        console.error('[invoice-pdf] generation failed:', err.message);
        res.status(500).json({ error: 'pdf_generation_failed', message: 'Something went wrong generating the PDF — please try again.' });
      });
  });

  app.use('/', router);
};
