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

  router.post('/api/auth/login', async (req, res) => {
    const { email, password, next: nextUrl } = req.body;
    const user = await db.get('SELECT * FROM users WHERE email = ?', [(email || '').toLowerCase().trim()]);
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

  router.post('/api/auth/register', async (req, res) => {
    const { name, email, password, company, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'missing_fields', message: 'Name, email, and password are required.' });
    }
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(409).json({ error: 'email_taken', message: 'An account with that email already exists.' });
    }
    const hash = bcrypt.hashSync(password, 10);
    const info = await db.run(
      `INSERT INTO users (name, email, password_hash, role, company, phone) VALUES (?, ?, ?, 'client', ?, ?)`,
      [name.trim(), email.toLowerCase().trim(), hash, company || null, phone || null]
    );
    req.session.user = {
      id: info.lastInsertRowid, name, email, role: 'client', company, phone,
      accountType: 'retail', corporateVerified: false, creditTermsDays: null, kraPin: null,
    };
    res.status(201).json({ user: req.session.user, redirectTo: '/marketplace' });
  });

  router.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  // Called only by the Next.js app's own server-side bridge route
  // (web/app/api/auth/clerk-sync/route.js) — never by the browser directly.
  // That route verifies the Clerk session server-side first (Clerk owns the
  // actual Google OAuth handshake entirely; this API never talks to Clerk or
  // Google at all), then hands us the already-verified identity here. We
  // trust it ONLY because it's carrying the shared secret both sides read
  // from their own .env — never from anything the browser could set itself.
  // From here it's just like a normal login: find-or-create the row in
  // `users`, set the same req.session.user shape every other login path
  // sets, and let the rest of the app (cart, checkout, orders, account
  // pages) keep working exactly as it does for an email+password user,
  // because it is one — Google is just how they proved who they are.
  router.post('/api/auth/clerk-login', async (req, res) => {
    const expectedSecret = process.env.INTERNAL_AUTH_SECRET;
    if (!expectedSecret) {
      console.error('[auth] INTERNAL_AUTH_SECRET is not set — refusing Clerk sign-in bridge requests.');
      return res.status(500).json({ error: 'not_configured', message: 'Google sign-in is not configured on this server yet.' });
    }
    if (req.get('x-internal-secret') !== expectedSecret) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const { clerkUserId, email, name } = req.body || {};
    if (!clerkUserId || !email) {
      return res.status(400).json({ error: 'missing_fields', message: 'clerkUserId and email are required.' });
    }
    const normalizedEmail = email.toLowerCase().trim();

    let user = await db.get('SELECT * FROM users WHERE clerk_user_id = ?', [clerkUserId]);

    if (!user) {
      // First time this Clerk identity has shown up. If someone already has
      // an account under this email (e.g. they originally registered with a
      // password), link Google to that same account instead of creating a
      // second one — Google has already verified they own this email
      // address, which is exactly the proof we'd otherwise ask a password
      // reset flow to provide.
      const existingByEmail = await db.get('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
      if (existingByEmail) {
        await db.run('UPDATE users SET clerk_user_id = ? WHERE id = ?', [clerkUserId, existingByEmail.id]);
        user = { ...existingByEmail, clerk_user_id: clerkUserId };
      } else {
        const info = await db.run(
          `INSERT INTO users (name, email, password_hash, role, clerk_user_id) VALUES (?, ?, NULL, 'client', ?)`,
          [(name || normalizedEmail).trim(), normalizedEmail, clerkUserId]
        );
        user = await db.get('SELECT * FROM users WHERE id = ?', [info.lastInsertRowid]);
      }
    }

    req.session.user = {
      id: user.id, name: user.name, email: user.email, role: user.role, company: user.company, phone: user.phone,
      accountType: user.account_type, corporateVerified: !!user.corporate_verified,
      creditTermsDays: user.credit_terms_days, kraPin: user.kra_pin,
    };
    const dest = user.role === 'admin' ? '/admin' : user.role === 'vendor' ? '/vendor' : '/marketplace';
    res.json({ user: req.session.user, redirectTo: dest });
  });

  app.use('/', router);
};
