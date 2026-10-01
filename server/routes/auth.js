const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/db');

function publicUser(sessionUser) {
  return sessionUser || null;
}

module.exports = function (app) {
  const router = express.Router();

  // Replaces the old server-rendered login/register pages' implicit
  // `res.locals.currentUser` — the Next.js app calls this on load (and after
  // login/logout) to know who's signed in.
  router.get('/api/auth/me', (req, res) => {
    res.json({ user: publicUser(req.session.user) });
  });

  router.post('/api/auth/login', (req, res) => {
    const { email, password, next: nextUrl } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get((email || '').toLowerCase().trim());
    if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
      return res.status(401).json({ error: 'invalid_credentials', message: 'Invalid email or password.' });
    }
    req.session.user = {
      id: user.id, name: user.name, email: user.email, role: user.role, company: user.company, phone: user.phone,
      accountType: user.account_type, corporateVerified: !!user.corporate_verified,
      creditTermsDays: user.credit_terms_days, kraPin: user.kra_pin,
    };
    const dest = nextUrl && nextUrl.startsWith('/') ? nextUrl : (
      user.role === 'admin' ? '/admin' : user.role === 'vendor' ? '/vendor' : '/marketplace'
    );
    res.json({ user: req.session.user, redirectTo: dest });
  });

  router.post('/api/auth/register', (req, res) => {
    const { name, email, password, company, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'missing_fields', message: 'Name, email, and password are required.' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'email_taken', message: 'An account with that email already exists.' });
    }
    const hash = bcrypt.hashSync(password, 10);
    const info = db.prepare(
      `INSERT INTO users (name, email, password_hash, role, company, phone) VALUES (?, ?, ?, 'client', ?, ?)`
    ).run(name.trim(), email.toLowerCase().trim(), hash, company || null, phone || null);
    req.session.user = {
      id: info.lastInsertRowid, name, email, role: 'client', company, phone,
      accountType: 'retail', corporateVerified: false, creditTermsDays: null, kraPin: null,
    };
    res.status(201).json({ user: req.session.user, redirectTo: '/marketplace' });
  });

  router.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.use('/', router);
};
