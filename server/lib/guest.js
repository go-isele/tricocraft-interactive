// Lets a non-registered visitor submit a Custom Brief or checkout a cart
// without creating an account first. We still need a `users` row to own the
// order (client_id is NOT NULL), so we transparently find-or-create one from
// the email they give us and log them in — a "soft register". They can set
// a real password later via /register using the same email if they want
// ongoing access; today this just gets their order into the system.

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db/db');

function findOrCreateGuestClient({ name, email, company, phone }) {
  const cleanEmail = (email || '').toLowerCase().trim();
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
  if (existing) return existing;

  const randomPassword = crypto.randomBytes(18).toString('hex');
  const hash = bcrypt.hashSync(randomPassword, 10);
  const info = db.prepare(
    `INSERT INTO users (name, email, password_hash, role, company, phone) VALUES (?, ?, ?, 'client', ?, ?)`
  ).run(name.trim(), cleanEmail, hash, company || null, phone || null);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
}

module.exports = { findOrCreateGuestClient };
