// WhatsApp-first commerce: (1) deep-links that carry cart/brief/order
// context straight into a WhatsApp chat thread for negotiation, design
// approval, or a quick reorder — this always works, no API/credentials
// needed, since it's just a `wa.me` URL; and (2) automated outbound status
// notifications via the Meta WhatsApp Cloud API, which degrades gracefully
// (logs to console) exactly like lib/mailer.js and lib/mpesa.js when
// WHATSAPP_CLOUD_TOKEN / WHATSAPP_PHONE_NUMBER_ID aren't set in .env.

const siteConfig = require('./site-config');

const isNotifyConfigured = !!(process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || 'v20.0';

/** Normalises a phone number for wa.me / Cloud API use: digits only, Kenyan-style leading 0 → 254. */
function normalizePhone(raw) {
  let n = String(raw || '').replace(/\D/g, '');
  if (n.startsWith('0')) n = '254' + n.slice(1);
  if (n.startsWith('+')) n = n.slice(1);
  return n;
}

/** Builds a `wa.me` deep link that opens WhatsApp with a prefilled message — works with zero setup. */
function buildDeepLink(message, phone) {
  const target = normalizePhone(phone || siteConfig.whatsappNumber);
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}

/** Prefilled message summarising a cart, for the "Continue on WhatsApp" button at checkout. */
function cartMessage(items, total, currencyLabel) {
  const lines = items.map((i) => {
    const opts = (i.selections || []).map((s) => `${s.optionName}: ${s.valueLabel}`).join(', ');
    return `• ${i.product.name} × ${i.quantity}${opts ? ' (' + opts + ')' : ''} — ${currencyLabel} ${i.lineTotal.toLocaleString()}`;
  }).join('\n');
  return `Hi TrioCraft! I'd like to discuss this order before confirming:\n\n${lines}\n\nTotal: ${currencyLabel} ${total.toLocaleString()}\n\nCan we go over pricing / lead time?`;
}

/** Prefilled message for a Custom Brief, so a guest can negotiate the brief directly instead of (or alongside) submitting the form. */
function briefMessage(title, brief) {
  return `Hi TrioCraft! I have a custom project brief:\n\nProject: ${title || '(untitled)'}\n\n${brief}\n\nCould we discuss quantity, pricing, and timeline?`;
}

/** Prefilled message for "message us about this order" / quick reorder from an order-detail page. */
function orderMessage(order) {
  return `Hi TrioCraft! I'd like to talk about Order #${order.id} (${order.title}) — could someone assist?`;
}

/**
 * Sends a templated WhatsApp status-update message via the Meta Cloud API.
 * Falls back to a console log when WHATSAPP_CLOUD_TOKEN / WHATSAPP_PHONE_NUMBER_ID
 * aren't set, so order-status triggers never fail a request — they just don't
 * send for real until credentials are added.
 */
async function sendStatusUpdate({ to, message }) {
  const phone = normalizePhone(to);
  if (!phone) return { sent: false, reason: 'no_recipient_phone' };

  if (!isNotifyConfigured) {
    console.log('\n[whatsapp] Cloud API not configured — would have sent:');
    console.log(`  To:      ${phone}`);
    console.log(`  Message: ${message}`);
    console.log('[whatsapp] Set WHATSAPP_CLOUD_TOKEN / WHATSAPP_PHONE_NUMBER_ID in .env to send for real.\n');
    return { sent: false, simulated: true, reason: 'whatsapp_not_configured' };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message },
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) return { sent: false, reason: data?.error?.message || 'send_failed', raw: data };
    return { sent: true, raw: data };
  } catch (err) {
    console.error('[whatsapp] Failed to send status update:', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = {
  normalizePhone, buildDeepLink, cartMessage, briefMessage, orderMessage,
  sendStatusUpdate, isNotifyConfigured,
};
