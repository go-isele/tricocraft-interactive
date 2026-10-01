require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const { attachUser } = require('./middleware/auth');
const db = require('./db/db'); // ensures schema is applied before routes touch it
const siteConfig = require('./lib/site-config');
const currencyLib = require('./lib/currency');

const app = express();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1); // behind Nginx in production

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' })); // mockup-editor canvas exports arrive as base64 PNG in the JSON body
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// In production, Next.js and this API sit behind the same Nginx host
// (see README-DEPLOY.md), so the session cookie is same-origin and no CORS
// is required. In local dev they run on different ports (Next.js on 3000,
// this API on 4000), so we allow that one origin with credentials so the
// browser will send/receive the session cookie during development.
if (!isProd) {
  const devOrigin = process.env.WEB_DEV_ORIGIN || 'http://localhost:3000';
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', devOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
}

app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: path.join(__dirname, 'db') }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  proxy: isProd,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
    sameSite: isProd ? 'lax' : 'lax',
    secure: isProd, // HTTPS only in production (Nginx terminates TLS)
  },
}));

app.use(attachUser(db));

// v9 — replaces the old global `res.locals.site` / `res.locals.fx` EJS
// pattern: the Next.js frontend fetches this once (site config + the
// viewer's chosen display currency + fx helpers-as-data) instead of every
// server-rendered view receiving it implicitly.
app.get('/api/site-config', (req, res) => {
  res.json({
    site: siteConfig,
    currency: req.session.currency || 'KES',
    supportedCurrencies: currencyLib.SUPPORTED_CURRENCIES,
  });
});

require('./routes/auth')(app);
require('./routes/marketing')(app);
require('./routes/resources')(app);
require('./routes/marketplace')(app);
require('./routes/payments')(app);
require('./routes/admin')(app);
require('./routes/vendor')(app);

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: "That endpoint doesn't exist." });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: 'An unexpected error occurred. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`TrioCraft API server running → http://localhost:${PORT}`);
});
