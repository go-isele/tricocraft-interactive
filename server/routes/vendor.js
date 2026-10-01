const express = require('express');
const db = require('../db/db');
const { requireRole } = require('../middleware/auth');
const { DELIVERY_METHODS } = require('../lib/delivery');
const { EAC_COUNTRIES } = require('../lib/cross-border');
const whatsapp = require('../lib/whatsapp');
const {
  STATUS_LABELS, STATUS_PROGRESS, NEXT_STATUS, JOB_CARD_CHECKLISTS,
  resolveOrderCategory: resolveOrderCategoryBase,
} = require('../lib/order-status');

const resolveOrderCategory = (order) => resolveOrderCategoryBase(db, order);

module.exports = function (app) {
  const router = express.Router();
  // Scoped to /api/vendor* only — see the note in routes/admin.js about why
  // this must carry an explicit path.
  router.use('/api/vendor', requireRole('vendor'));

  async function myProviders(req) {
    return db.all('SELECT * FROM providers WHERE name = ?', [req.session.user.company]);
  }

  router.get('/api/vendor/orders', async (req, res) => {
    const providers = await myProviders(req);
    const providerIds = providers.map((p) => p.id);
    const orders = providerIds.length
      ? await db.all(
          `SELECT o.*, u.name AS client_name FROM orders o JOIN users u ON u.id = o.client_id
           WHERE o.provider_id IN (${providerIds.map(() => '?').join(',')}) ORDER BY o.updated_at DESC`,
          providerIds
        )
      : [];
    res.json({ orders, providers, STATUS_LABELS, STATUS_PROGRESS, NEXT_STATUS });
  });

  router.get('/api/vendor/orders/:id', async (req, res) => {
    const order = await db.get(
      `SELECT o.*, u.name AS client_name FROM orders o JOIN users u ON u.id = o.client_id WHERE o.id = ?`,
      [req.params.id]
    );
    if (!order) return res.status(404).json({ error: 'not_found', message: 'Order not found.' });
    const timeline = await db.all('SELECT * FROM order_timeline WHERE order_id = ? ORDER BY created_at ASC', [order.id]);
    const payments = await db.all('SELECT id, method, amount, status, mpesa_receipt, created_at FROM payments WHERE order_id = ? ORDER BY created_at DESC', [order.id]);
    const options = order.options_json ? JSON.parse(order.options_json) : [];
    const aiBrief = order.ai_brief_json ? JSON.parse(order.ai_brief_json) : null;
    res.json({
      order, timeline, payments, options, aiBrief,
      category: await resolveOrderCategory(order),
      STATUS_LABELS, STATUS_PROGRESS, NEXT_STATUS, DELIVERY_METHODS, EAC_COUNTRIES,
      jobCard: JOB_CARD_CHECKLISTS[order.status] || null,
    });
  });

  router.post('/api/vendor/orders/:id/advance', async (req, res) => {
    const { note } = req.body;
    const order = await db.get(
      `SELECT o.*, u.phone AS client_phone FROM orders o JOIN users u ON u.id = o.client_id WHERE o.id = ?`,
      [req.params.id]
    );
    if (!order) return res.status(404).json({ error: 'not_found', message: 'Order not found.' });
    const next = NEXT_STATUS[order.status];
    if (next) {
      // v5 — fold whatever job-card checklist items the vendor ticked into
      // the timeline note, so admin/client see exactly what was confirmed
      // before the job moved forward (nothing here blocks the advance if a
      // box is left unchecked — it's a real accountability record, not a
      // hard gate).
      const jobCard = JOB_CARD_CHECKLISTS[order.status];
      const checked = [].concat(req.body.checklist_items || []).filter(Boolean);
      const checklistNote = jobCard && checked.length
        ? `${jobCard.title} confirmed: ${checked.join('; ')}.`
        : '';
      const fullNote = [checklistNote, note].filter(Boolean).join(' ') || `Moved to ${STATUS_LABELS[next]} by production partner.`;

      await db.run(`UPDATE orders SET status = ?, progress = ?, updated_at = NOW() WHERE id = ?`,
        [next, STATUS_PROGRESS[next] ?? order.progress, order.id]);
      await db.run('INSERT INTO order_timeline (order_id, stage, notes) VALUES (?, ?, ?)',
        [order.id, STATUS_LABELS[next], fullNote]);
      await whatsapp.sendStatusUpdate({
        to: order.client_phone,
        message: `TrioCraft Order #${order.id} (${order.title}) is now: ${STATUS_LABELS[next]}.${note ? ' Note: ' + note : ''}`,
      });
    }
    const updated = await db.get('SELECT * FROM orders WHERE id = ?', [order.id]);
    res.json({ order: updated });
  });

  app.use('/', router);
};
