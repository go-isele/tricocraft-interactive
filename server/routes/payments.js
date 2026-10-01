const express = require('express');
const db = require('../db/db');
const { initiateSTKPush } = require('../lib/mpesa');
const { initiateMtnMomo, initiateAirtelMoney } = require('../lib/regional-momo');
const { requireRole } = require('../middleware/auth');
const whatsapp = require('../lib/whatsapp');
const currency = require('../lib/currency');

module.exports = function (app) {
  const router = express.Router();

  // ── Client-initiated: prompt an STK push for one order's outstanding balance (Kenya / KES) ──
  router.post('/api/marketplace/orders/:id/pay-mpesa', requireRole('client', 'admin', 'vendor'), async (req, res) => {
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'not_found', message: 'Order not found.' });
    if (req.session.user.role === 'client' && order.client_id !== req.session.user.id) {
      return res.status(403).json({ error: 'forbidden', message: 'This order belongs to another client.' });
    }

    const { phone } = req.body;
    const unitPrice = order.quoted_price || order.calculated_unit_price || 0;
    const amount = unitPrice * order.quantity;

    if (!phone || amount <= 0) {
      return res.status(400).json({ error: 'invalid_request', message: 'A phone number and a positive order amount are required.' });
    }

    const result = await initiateSTKPush({
      phone,
      amount,
      accountRef: `TC-ORD-${order.id}`,
      description: `TrioCraft Order #${order.id}`,
    });

    await db.run(
      `INSERT INTO payments (order_id, method, phone, amount, currency, provider_ref, merchant_request_id, status, result_desc)
       VALUES (?, 'mpesa', ?, ?, 'KES', ?, ?, ?, ?)`,
      [
        order.id, phone, amount,
        result.checkoutRequestId || null, result.merchantRequestId || null,
        result.success ? 'pending' : 'failed',
        result.simulated ? 'Simulated push (Daraja not configured)' : (result.reason || null),
      ]
    );

    await db.run('INSERT INTO order_timeline (order_id, stage, notes) VALUES (?, ?, ?)', [
      order.id, 'M-Pesa Payment Requested',
      result.success
        ? `STK push sent to ${phone} for KES ${amount.toLocaleString()}${result.simulated ? ' (simulated — Daraja not configured)' : ''}.`
        : `STK push failed: ${result.reason}`,
    ]);

    res.json({ success: result.success, simulated: !!result.simulated, reason: result.reason || null });
  });

  // ── Regional mobile money — MTN MoMo (Uganda) / Airtel Money (Tanzania, Rwanda) ──
  // Charged in the order's display currency; see lib/regional-momo.js for the
  // graceful-degradation contract (simulates without real API credentials).
  router.post('/api/marketplace/orders/:id/pay-regional', requireRole('client', 'admin', 'vendor'), async (req, res) => {
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'not_found', message: 'Order not found.' });
    if (req.session.user.role === 'client' && order.client_id !== req.session.user.id) {
      return res.status(403).json({ error: 'forbidden', message: 'This order belongs to another client.' });
    }

    const { phone, provider, country } = req.body; // provider: 'momo' (Uganda/UGX) or 'airtel_money' (Tanzania/TZS or Rwanda/RWF); country (airtel_money only): 'TZ' or 'RW', defaults to 'TZ'
    const unitPrice = order.quoted_price || order.calculated_unit_price || 0;
    const amountKes = unitPrice * order.quantity;
    // Default target currency comes from the provider (MoMo is Uganda-only;
    // Airtel Money covers both Tanzania and Rwanda, so it also needs the
    // destination country) — NOT hardcoded to UGX.
    const airtelCountry = country === 'RW' ? 'RW' : 'TZ';
    const defaultCurrency = provider === 'airtel_money' ? (airtelCountry === 'RW' ? 'RWF' : 'TZS') : 'UGX';
    const targetCurrency = order.currency !== 'KES' ? order.currency : defaultCurrency;
    const amount = (await currency.convertFromKes(amountKes, targetCurrency)) || amountKes;

    if (!phone || amount <= 0) {
      return res.status(400).json({ error: 'invalid_request', message: 'A phone number and a positive order amount are required.' });
    }

    const reference = `TC-ORD-${order.id}-${Date.now()}`;
    const result = provider === 'airtel_money'
      ? await initiateAirtelMoney({ phone, amount, currency: targetCurrency, reference, country: airtelCountry })
      : await initiateMtnMomo({ phone, amount, currency: targetCurrency, reference, description: `TrioCraft Order #${order.id}` });

    await db.run(
      `INSERT INTO payments (order_id, method, phone, amount, currency, provider_ref, status, result_desc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id, provider === 'airtel_money' ? 'airtel_money' : 'momo', phone, amount, targetCurrency,
        result.referenceId || result.transactionId || null,
        result.success ? 'pending' : 'failed',
        result.simulated ? 'Simulated push (regional provider not configured)' : (result.reason || null),
      ]
    );

    await db.run('INSERT INTO order_timeline (order_id, stage, notes) VALUES (?, ?, ?)', [
      order.id, 'Regional Payment Requested',
      result.success
        ? `${provider === 'airtel_money' ? 'Airtel Money' : 'MTN MoMo'} request sent to ${phone} for ${targetCurrency} ${amount.toLocaleString()}${result.simulated ? ' (simulated)' : ''}.`
        : `Regional payment request failed: ${result.reason}`,
    ]);

    res.json({ success: result.success, simulated: !!result.simulated, reason: result.reason || null });
  });

  // ── Safaricom's webhook — no session, validated by shape rather than auth ──
  router.post('/api/mpesa/callback', async (req, res) => {
    try {
      const stkCallback = req.body?.Body?.stkCallback;
      if (!stkCallback) return res.status(400).json({ received: false });

      const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;
      const payment = await db.get('SELECT * FROM payments WHERE provider_ref = ?', [CheckoutRequestID]);
      if (!payment) return res.status(200).json({ received: true, note: 'No matching payment record' });

      const items = CallbackMetadata?.Item || [];
      const get = (name) => items.find((i) => i.Name === name)?.Value;
      const mpesaReceipt = get('MpesaReceiptNumber') || null;
      const success = Number(ResultCode) === 0;

      await db.run(
        `UPDATE payments SET status = ?, result_desc = ?, mpesa_receipt = ?, raw_callback = ?, updated_at = NOW() WHERE id = ?`,
        [success ? 'completed' : 'failed', ResultDesc, mpesaReceipt, JSON.stringify(req.body), payment.id]
      );

      if (success) {
        await db.run(`UPDATE orders SET payment_status = 'paid', updated_at = NOW() WHERE id = ?`, [payment.order_id]);
        await db.run('INSERT INTO order_timeline (order_id, stage, notes) VALUES (?, ?, ?)', [
          payment.order_id, 'Payment Confirmed', `M-Pesa receipt ${mpesaReceipt || '—'} for KES ${payment.amount.toLocaleString()}.`,
        ]);
        const order = await db.get(
          `SELECT o.id, o.title, u.phone AS client_phone FROM orders o JOIN users u ON u.id = o.client_id WHERE o.id = ?`,
          [payment.order_id]
        );
        if (order) {
          await whatsapp.sendStatusUpdate({
            to: order.client_phone,
            message: `Payment confirmed for TrioCraft Order #${order.id} — KES ${payment.amount.toLocaleString()} received (M-Pesa receipt ${mpesaReceipt || '—'}). Thank you!`,
          });
        }
      } else {
        await db.run('INSERT INTO order_timeline (order_id, stage, notes) VALUES (?, ?, ?)', [
          payment.order_id, 'Payment Failed', ResultDesc || 'M-Pesa payment was not completed.',
        ]);
      }

      res.status(200).json({ received: true });
    } catch (err) {
      console.error('[mpesa callback] error:', err.message);
      res.status(200).json({ received: true, error: 'internal_error_logged' }); // ack anyway — Daraja retries on non-200
    }
  });

  // ── Lightweight polling endpoint the order page can use to check status ──
  router.get('/api/marketplace/orders/:id/payments', requireRole('client', 'admin', 'vendor'), async (req, res) => {
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'not_found' });
    if (req.session.user.role === 'client' && order.client_id !== req.session.user.id) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const payments = await db.all('SELECT id, method, phone, amount, currency, status, mpesa_receipt, created_at FROM payments WHERE order_id = ? ORDER BY created_at DESC', [order.id]);
    res.json({ payments });
  });

  app.use('/', router);
};
