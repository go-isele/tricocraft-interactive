// Multi-currency DISPLAY for the EAC region. KES stays the one authoritative
// transaction currency — every product price, pricing-engine calculation,
// order row, and M-Pesa charge is computed and stored in KES, exactly as
// before. This module only converts KES → another currency for on-screen
// display (product page, cart, order summary) using exchange rates stored
// in the `fx_rates` table, editable from /admin/fx-rates.
//
// ⚠️ These rates are NOT fetched live from any market-data API — there's no
// single free, reliable, no-signup source that covers KES/UGX/TZS/RWF pairs
// specifically. Seeded rates are illustrative starting points and WILL drift
// out of date; update them periodically from a source your finance team
// trusts (a bank, XE, or a licensed EAC payment switch), or wire a live feed
// into `getRate()` below if you have one.

const db = require('../db/db');

const SUPPORTED_CURRENCIES = [
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KES' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'FRw' },
];

function listRates() {
  const rows = db.prepare('SELECT * FROM fx_rates ORDER BY currency_code').all();
  const byCode = {};
  rows.forEach((r) => { byCode[r.currency_code] = r; });
  return { rows, byCode };
}

/** How many KES one unit of `currencyCode` is worth. KES itself is always 1. */
function getRate(currencyCode) {
  if (currencyCode === 'KES') return 1;
  const row = db.prepare('SELECT kes_per_unit FROM fx_rates WHERE currency_code = ?').get(currencyCode);
  return row ? row.kes_per_unit : null;
}

/** Converts a KES amount into `currencyCode`, rounded to a sensible display precision. */
function convertFromKes(amountKes, currencyCode) {
  if (!currencyCode || currencyCode === 'KES') return Math.round(amountKes);
  const rate = getRate(currencyCode);
  if (!rate) return null; // unknown/unconfigured currency — caller should fall back to KES
  return Math.round(amountKes / rate);
}

function formatAmount(amountKes, currencyCode) {
  const code = currencyCode || 'KES';
  const meta = SUPPORTED_CURRENCIES.find((c) => c.code === code) || { symbol: code };
  const converted = convertFromKes(amountKes, code);
  if (converted == null) return `KES ${Math.round(amountKes).toLocaleString()}`;
  return `${meta.symbol} ${converted.toLocaleString()}`;
}

function upsertRate(currencyCode, kesPerUnit) {
  const existing = db.prepare('SELECT currency_code FROM fx_rates WHERE currency_code = ?').get(currencyCode);
  if (existing) {
    db.prepare(`UPDATE fx_rates SET kes_per_unit = ?, updated_at = datetime('now') WHERE currency_code = ?`)
      .run(kesPerUnit, currencyCode);
  } else {
    db.prepare(`INSERT INTO fx_rates (currency_code, kes_per_unit, updated_at) VALUES (?, ?, datetime('now'))`)
      .run(currencyCode, kesPerUnit);
  }
}

module.exports = { SUPPORTED_CURRENCIES, listRates, getRate, convertFromKes, formatAmount, upsertRate };
