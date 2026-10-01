const express = require('express');
const db = require('../db/db');
const { requireRole } = require('../middleware/auth');
const { DELIVERY_METHODS } = require('../lib/delivery');
const whatsapp = require('../lib/whatsapp');
const etims = require('../lib/etims');
const currency = require('../lib/currency');
const mailer = require('../lib/mailer');
const { STATUS_PROGRESS, STATUS_LABELS, resolveOrderCategory: resolveOrderCategoryBase, addTimeline: addTimelineBase } = require('../lib/order-status');

const resolveOrderCategory = (order) => resolveOrderCategoryBase(db, order);
const addTimeline = (orderId, stage, notes) => addTimelineBase(db, orderId, stage, notes);

const PAYMENT_TERM_DAYS = { net30: 30, net60: 60, net90: 90 };

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

module.exports = function (app) {
  const router = express.Router();
  // Scoped to /api/admin* only — must NOT use router.use(requireRole(...))
  // with no path, or it silently gates every unmatched request on the whole API.
  router.use('/api/admin', requireRole('admin'));

  router.get('/api/admin/stats', (req, res) => {
    const stats = {
      orders: db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,
      activeOrders: db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE status NOT IN ('completed','cancelled')`).get().n,
      clients: db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'client'`).get().n,
      providers: db.prepare('SELECT COUNT(*) AS n FROM providers').get().n,
      revenueQuoted: db.prepare(`SELECT COALESCE(SUM(quoted_price * quantity), 0) AS n FROM orders WHERE quoted_price IS NOT NULL`).get().n,
      pendingPayments: db.prepare(`SELECT COUNT(*) AS n FROM payments WHERE status = 'pending'`).get().n,
      corporateAccounts: db.prepare(`SELECT COUNT(*) AS n FROM users WHERE account_type = 'corporate' AND corporate_verified = 1`).get().n,
      overdueInvoices: db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE invoice_status = 'invoiced' AND invoice_due_date IS NOT NULL AND invoice_due_date < date('now')`).get().n,
    };
    const recentOrders = db.prepare(
      `SELECT o.*, u.name AS client_name, u.company AS client_company FROM orders o
       JOIN users u ON u.id = o.client_id ORDER BY o.created_at DESC LIMIT 10`
    ).all();
    res.json({ stats, recentOrders, STATUS_LABELS });
  });

  router.get('/api/admin/orders', (req, res) => {
    const statusFilter = req.query.status || null;
    const base = `SELECT o.*, u.name AS client_name, u.company AS client_company, p.name AS provider_name
                  FROM orders o JOIN users u ON u.id = o.client_id LEFT JOIN providers p ON p.id = o.provider_id`;
    const orders = statusFilter
      ? db.prepare(`${base} WHERE o.status = ? ORDER BY o.created_at DESC`).all(statusFilter)
      : db.prepare(`${base} ORDER BY o.created_at DESC`).all();
    res.json({ orders, statusFilter, STATUS_LABELS });
  });

  router.get('/api/admin/orders/:id', (req, res) => {
    const order = db.prepare(
      `SELECT o.*, u.name AS client_name, u.email AS client_email, u.company AS client_company, u.phone AS client_phone,
              u.kra_pin AS client_kra_pin, u.account_type AS client_account_type, u.corporate_verified AS client_corporate_verified
       FROM orders o JOIN users u ON u.id = o.client_id WHERE o.id = ?`
    ).get(req.params.id);
    if (!order) return res.status(404).json({ error: 'not_found', message: 'Order not found.' });
    const timeline = db.prepare('SELECT * FROM order_timeline WHERE order_id = ? ORDER BY created_at ASC').all(order.id);
    const providers = db.prepare('SELECT * FROM providers ORDER BY name').all();
    const payments = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC').all(order.id);
    const options = order.options_json ? JSON.parse(order.options_json) : [];
    const aiBrief = order.ai_brief_json ? JSON.parse(order.ai_brief_json) : null;
    res.json({
      order, timeline, providers, payments, options, aiBrief,
      category: resolveOrderCategory(order), STATUS_LABELS, DELIVERY_METHODS,
    });
  });

  router.post('/api/admin/orders/:id/update', async (req, res) => {
    const { status, provider_id, quoted_price, payment_status, note, delivery_method, delivery_partner, delivery_town, delivery_address } = req.body;
    const order = db.prepare(
      `SELECT o.*, u.phone AS client_phone FROM orders o JOIN users u ON u.id = o.client_id WHERE o.id = ?`
    ).get(req.params.id);
    if (!order) return res.status(404).json({ error: 'not_found', message: 'Order not found.' });

    const nextStatus = status || order.status;
    db.prepare(
      `UPDATE orders SET status = ?, provider_id = ?, quoted_price = ?, payment_status = ?, progress = ?,
                          delivery_method = ?, delivery_partner = ?, delivery_town = ?, delivery_address = ?,
                          updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      nextStatus,
      provider_id ? Number(provider_id) : order.provider_id,
      quoted_price !== '' && quoted_price != null ? Number(quoted_price) : order.quoted_price,
      payment_status || order.payment_status,
      STATUS_PROGRESS[nextStatus] ?? order.progress,
      delivery_method || order.delivery_method,
      delivery_partner || order.delivery_partner,
      delivery_town || order.delivery_town,
      delivery_address || order.delivery_address,
      order.id
    );
    if (nextStatus !== order.status || note) {
      addTimeline(order.id, STATUS_LABELS[nextStatus] || nextStatus, note || `Status updated to ${STATUS_LABELS[nextStatus] || nextStatus}.`);
    }
    if (nextStatus !== order.status) {
      await whatsapp.sendStatusUpdate({
        to: order.client_phone,
        message: `TrioCraft Order #${order.id} (${order.title}) is now: ${STATUS_LABELS[nextStatus] || nextStatus}.${note ? ' Note: ' + note : ''}`,
      });
    }
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    res.json({ order: updated });
  });

  // Formally invoices an order: assigns an invoice number + due date (based
  // on the order's payment terms), issues a KRA e-TIMS fiscal receipt
  // (simulated until ETIMS_API_URL/ETIMS_API_KEY are set — see lib/etims.js),
  // and notifies the client by email + WhatsApp.
  router.post('/api/admin/orders/:id/invoice', async (req, res) => {
    const order = db.prepare(
      `SELECT o.*, u.name AS client_name, u.email AS client_email, u.company AS client_company, u.phone AS client_phone, u.kra_pin AS client_kra_pin
       FROM orders o JOIN users u ON u.id = o.client_id WHERE o.id = ?`
    ).get(req.params.id);
    if (!order) return res.status(404).json({ error: 'not_found', message: 'Order not found.' });

    const unitPrice = order.quoted_price || order.calculated_unit_price || 0;
    const amount = unitPrice * order.quantity;
    const invoiceNumber = `INV-${order.id}-${Date.now().toString().slice(-6)}`;
    const dueDate = addDays(PAYMENT_TERM_DAYS[order.payment_terms] || 7);

    const fiscal = await etims.issueFiscalInvoice({
      orderId: order.id, buyerName: order.client_company || order.client_name, buyerPin: order.client_kra_pin,
      amount, items: [{ description: order.title, quantity: order.quantity, unitPrice }],
    });

    db.prepare(
      `UPDATE orders SET invoice_number = ?, invoice_due_date = ?, invoice_status = 'invoiced',
                          etims_invoice_number = ?, etims_status = ?, etims_control_number = ?, etims_simulated = ?,
                          etims_qr_data_url = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      invoiceNumber, dueDate, fiscal.invoiceNumber || null, fiscal.success ? 'issued' : 'failed',
      fiscal.controlNumber || null, fiscal.simulated === false ? 0 : 1, fiscal.qrDataUrl || null, order.id
    );

    addTimeline(order.id, 'Invoiced', `Invoice ${invoiceNumber} issued, due ${dueDate}.${fiscal.simulated ? ' (e-TIMS simulated — not yet configured)' : ''}`);

    await whatsapp.sendStatusUpdate({
      to: order.client_phone,
      message: `Your TrioCraft invoice ${invoiceNumber} for Order #${order.id} (KES ${amount.toLocaleString()}) has been issued, due ${dueDate}. Download it from your order page.`,
    });
    await mailer.notify({
      subject: `Invoice ${invoiceNumber} issued — Order #${order.id}`,
      text: `Invoice ${invoiceNumber} for KES ${amount.toLocaleString()} has been issued to ${order.client_email}, due ${dueDate}.`,
    });

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    res.json({ order: updated });
  });

  // ── Corporate / B2B credit accounts ──
  router.get('/api/admin/clients', (req, res) => {
    // Explicit column list — this now travels over a public JSON API rather
    // than staying server-side inside an EJS render, so `SELECT *` would leak
    // password_hash to the browser. No other behaviour changes.
    const clients = db.prepare(
      `SELECT id, name, email, role, company, phone, account_type, corporate_verified, credit_terms_days, kra_pin, created_at
       FROM users WHERE role = 'client' ORDER BY account_type DESC, name`
    ).all();
    res.json({ clients });
  });

  router.post('/api/admin/clients/:id/update', (req, res) => {
    const { account_type, corporate_verified, credit_terms_days, kra_pin } = req.body;
    db.prepare(
      `UPDATE users SET account_type = ?, corporate_verified = ?, credit_terms_days = ?, kra_pin = ? WHERE id = ?`
    ).run(
      account_type === 'corporate' ? 'corporate' : 'retail',
      corporate_verified ? 1 : 0,
      credit_terms_days ? Number(credit_terms_days) : null,
      kra_pin || null,
      req.params.id
    );
    const client = db.prepare(
      `SELECT id, name, email, role, company, phone, account_type, corporate_verified, credit_terms_days, kra_pin, created_at
       FROM users WHERE id = ?`
    ).get(req.params.id);
    res.json({ client });
  });

  // ── EAC multi-currency FX rates (display only — see lib/currency.js) ──
  router.get('/api/admin/fx-rates', (req, res) => {
    const { rows } = currency.listRates();
    res.json({ rates: rows, supported: currency.SUPPORTED_CURRENCIES });
  });

  router.post('/api/admin/fx-rates/update', (req, res) => {
    const { currency_code, kes_per_unit } = req.body;
    if (currency_code && kes_per_unit) currency.upsertRate(currency_code, Number(kes_per_unit));
    const { rows } = currency.listRates();
    res.json({ rates: rows });
  });

  // ── Catalogue management ──
  router.get('/api/admin/catalogue', (req, res) => {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
    const products = db.prepare(
      `SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id ORDER BY c.sort_order, p.name`
    ).all().map((p) => ({
      ...p,
      options: db.prepare('SELECT * FROM product_options WHERE product_id = ? ORDER BY sort_order').all(p.id)
        .map((o) => ({ ...o, values: db.prepare('SELECT * FROM product_option_values WHERE option_id = ? ORDER BY sort_order').all(o.id) })),
      tiers: db.prepare('SELECT * FROM product_quantity_tiers WHERE product_id = ? ORDER BY min_qty').all(p.id),
    }));
    const providers = db.prepare(
      `SELECT pr.*, c.name AS category_name FROM providers pr LEFT JOIN categories c ON c.id = pr.category_id ORDER BY pr.name`
    ).all();
    res.json({ categories, products, providers });
  });

  router.post('/api/admin/catalogue/products/add', (req, res) => {
    const { name, category_id, description, base_price, min_quantity } = req.body;
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
    const info = db.prepare(
      `INSERT INTO products (category_id, name, slug, description, base_price, min_quantity) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(Number(category_id), name, slug, description || null, Number(base_price) || 0, Number(min_quantity) || 1);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ product });
  });

  router.post('/api/admin/catalogue/products/:id/delete', (req, res) => {
    db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  // ── Print pricing engine: options + values + quantity tiers ──
  router.post('/api/admin/catalogue/products/:id/options/add', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name_required' });
    const info = db.prepare('INSERT INTO product_options (product_id, name) VALUES (?, ?)').run(Number(req.params.id), name);
    const option = db.prepare('SELECT * FROM product_options WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ option });
  });

  router.post('/api/admin/catalogue/options/:optionId/values/add', (req, res) => {
    const { label, price_delta, is_default } = req.body;
    if (!label) return res.status(400).json({ error: 'label_required' });
    const info = db.prepare(
      'INSERT INTO product_option_values (option_id, label, price_delta, is_default) VALUES (?, ?, ?, ?)'
    ).run(Number(req.params.optionId), label, Number(price_delta) || 0, is_default ? 1 : 0);
    const value = db.prepare('SELECT * FROM product_option_values WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ value });
  });

  router.post('/api/admin/catalogue/options/:optionId/delete', (req, res) => {
    db.prepare('DELETE FROM product_option_values WHERE option_id = ?').run(req.params.optionId);
    db.prepare('DELETE FROM product_options WHERE id = ?').run(req.params.optionId);
    res.json({ ok: true });
  });

  router.post('/api/admin/catalogue/products/:id/tiers/add', (req, res) => {
    const { min_qty, max_qty, unit_price } = req.body;
    if (!min_qty || !unit_price) return res.status(400).json({ error: 'missing_fields' });
    const info = db.prepare(
      'INSERT INTO product_quantity_tiers (product_id, min_qty, max_qty, unit_price) VALUES (?, ?, ?, ?)'
    ).run(Number(req.params.id), Number(min_qty), max_qty ? Number(max_qty) : null, Number(unit_price));
    const tier = db.prepare('SELECT * FROM product_quantity_tiers WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ tier });
  });

  router.post('/api/admin/catalogue/tiers/:tierId/delete', (req, res) => {
    db.prepare('DELETE FROM product_quantity_tiers WHERE id = ?').run(req.params.tierId);
    res.json({ ok: true });
  });

  router.post('/api/admin/catalogue/providers/add', (req, res) => {
    const { name, category_id, turnaround_days, location, specialty, notes } = req.body;
    const info = db.prepare(
      `INSERT INTO providers (name, category_id, vetted, pantone_matched, turnaround_days, location, specialty, notes)
       VALUES (?, ?, 1, 1, ?, ?, ?, ?)`
    ).run(name, category_id ? Number(category_id) : null, Number(turnaround_days) || 7, location || 'Nairobi, Kenya', specialty || null, notes || null);
    const provider = db.prepare('SELECT * FROM providers WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ provider });
  });

  // ── Blog / Resources management ──
  router.get('/api/admin/blog', (req, res) => {
    const posts = db.prepare('SELECT * FROM blog_posts ORDER BY published_at DESC').all();
    res.json({ posts });
  });

  router.get('/api/admin/blog/:id', (req, res) => {
    const post = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'not_found', message: 'Post not found.' });
    res.json({ post });
  });

  router.post('/api/admin/blog/save', (req, res) => {
    const { id, slug, title, eyebrow, excerpt, meta_description, read_minutes, body_html } = req.body;
    let savedId = id ? Number(id) : null;
    if (savedId) {
      db.prepare(
        `UPDATE blog_posts SET slug=?, title=?, eyebrow=?, excerpt=?, meta_description=?, read_minutes=?, body_html=? WHERE id=?`
      ).run(slug, title, eyebrow, excerpt, meta_description, Number(read_minutes) || 5, body_html, savedId);
    } else {
      const info = db.prepare(
        `INSERT INTO blog_posts (slug, title, eyebrow, excerpt, meta_description, read_minutes, body_html) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(slug, title, eyebrow, excerpt, meta_description, Number(read_minutes) || 5, body_html);
      savedId = info.lastInsertRowid;
    }
    const post = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(savedId);
    res.status(200).json({ post });
  });

  router.post('/api/admin/blog/:id/delete', (req, res) => {
    db.prepare('DELETE FROM blog_posts WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  app.use('/', router);
};
