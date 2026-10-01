// Deliberately NOT under /api/ — see the note at the top of web/proxy.js:
// Nginx sends every /api/* request straight to the Express backend, so a
// route handler here would never be reached in production if it lived there.
//
// This is the only piece of code in the whole app that knows both "Clerk"
// and "our session cookie" at the same time. Everything before this point
// (the Google button, the /sso-callback page) only talks to Clerk.
// Everything after this point (cart, checkout, account, orders) only talks
// to the Express API via the normal session cookie, completely unaware
// Clerk/Google was ever involved — see server/routes/auth.js's
// POST /api/auth/clerk-login for the other half of this handshake.
import { auth, currentUser } from '@clerk/nextjs/server';
import { INTERNAL_API_URL } from '@/lib/api';

export async function POST() {
  // Nobody should be able to reach this with Clerk unconfigured (the Google
  // button doesn't render — see CLERK_ENABLED in login/register pages — and
  // the proxy's clerkMiddleware() is itself a no-op until CLERK_SECRET_KEY
  // is set), but fail with a plain, explicit response rather than whatever
  // `auth()` does without a configured middleware in front of it.
  if (!process.env.CLERK_SECRET_KEY) {
    return Response.json({ error: 'not_configured', message: 'Google sign-in is not set up yet.' }, { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'unauthenticated', message: 'No Clerk session found.' }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress
    || clerkUser?.emailAddresses?.[0]?.emailAddress
    || null;
  if (!email) {
    return Response.json({ error: 'no_email', message: 'Your Google account has no email address Clerk can share with us.' }, { status: 400 });
  }
  const name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ').trim() || email;

  const upstream = await fetch(`${INTERNAL_API_URL}/api/auth/clerk-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': process.env.INTERNAL_AUTH_SECRET || '',
    },
    body: JSON.stringify({ clerkUserId: userId, email, name }),
    cache: 'no-store',
  });

  const data = await upstream.json().catch(() => null);
  const res = Response.json(data, { status: upstream.status });

  // Forward the Express session cookie it just set onto OUR response, so the
  // browser stores it exactly as if it had called /api/auth/login directly.
  // getSetCookie() (not .get('set-cookie')) is required here because a plain
  // .get() comma-joins multiple Set-Cookie headers into one string, which is
  // wrong per-spec and would corrupt a cookie whose value contains a comma
  // (e.g. an Expires date) — see MDN's Headers.getSetCookie().
  const setCookies = typeof upstream.headers.getSetCookie === 'function'
    ? upstream.headers.getSetCookie()
    : [];
  for (const cookie of setCookies) {
    res.headers.append('set-cookie', cookie);
  }

  return res;
}
