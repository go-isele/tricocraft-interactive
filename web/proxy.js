// NOTE: this is Next.js 16's `proxy.js` convention — the renamed replacement
// for the old `middleware.js` (see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
// Clerk's `clerkMiddleware()` doesn't care what the file is called; it's
// just a plain (request) => response function, so exporting it as the
// default export here is all `proxy.js` needs.
//
// This does NOT lock any page behind sign-in — it just makes Clerk's auth
// state available (via `auth()`/`currentUser()`) to anything that asks for
// it, e.g. the /api/auth/clerk-sync route handler. The marketplace,
// /account pages, /admin, and /vendor all still guard themselves exactly as
// they did before (admin/vendor via the existing session-based
// requireRole() middleware on the Express API — see server/middleware/auth.js
// — which Clerk has no part in).
import { clerkMiddleware } from '@clerk/nextjs/server';

// clerkMiddleware() throws immediately if CLERK_SECRET_KEY isn't set — and
// since this proxy runs on nearly every request (see matcher below), that
// would 500 the entire site, not just the Google sign-in pages. This app
// runs for a while with Google sign-in deployed but Clerk not yet
// configured (see README-DEPLOY.md, "Google sign-in (Clerk)"), so fall back
// to a harmless no-op proxy until the keys are actually in place — matches
// the same CLERK_ENABLED guard in web/app/layout.js.
const CLERK_CONFIGURED = Boolean(process.env.CLERK_SECRET_KEY);

export default CLERK_CONFIGURED ? clerkMiddleware() : function proxy() {};

// NOTE: no `/api/*` entry here on purpose — in production every `/api/*`
// request is proxied straight to the Express backend by Nginx and never
// reaches this Next.js process at all (see deploy/nginx.conf), which is
// exactly why the Clerk↔Express bridge route below lives at /auth/clerk-sync
// instead of /api/auth/clerk-sync — a route under /api/ here would be
// unreachable in production.
export const config = {
  matcher: [
    // Skip Next's internal static/image assets and anything that looks like
    // a static file (has a file extension) — Clerk's own recommended default.
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
