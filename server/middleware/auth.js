// Session-based auth helpers — converted from the v8 EJS app's
// redirect/render behavior to pure JSON responses, since this server is now
// an API-only backend consumed by the Next.js frontend. The session cookie
// itself (express-session + connect-sqlite3) is unchanged — Next.js and
// Express share it because both sit behind the same Nginx host/origin.

function attachUser(db) {
  return (req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    next();
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'unauthenticated', message: 'You must be logged in to view this.' });
    }
    if (roles.length && !roles.includes(user.role)) {
      return res.status(403).json({ error: 'forbidden', message: "You don't have permission to do that." });
    }
    next();
  };
}

module.exports = { attachUser, requireRole };
