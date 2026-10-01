// Thin fetch wrapper around the TrioCraft Express API.
//
// Same-origin in production (both apps sit behind one Nginx host — see
// README-DEPLOY.md — so no CORS is needed and the express-session cookie
// rides along automatically). In local dev the two apps run on different
// ports, so client-side calls use `credentials: 'include'` and the API's
// dev-only CORS middleware (see server/server.js) allows the Next.js origin.

// Server Components / Server Actions call the API directly on the internal
// URL (same machine in production, localhost:4000 in dev).
export const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://localhost:4000';

// Client Components call the API through this base. In production this must
// be explicitly set to an EMPTY string in web/.env.production.local (see
// README-DEPLOY.md) — same-origin behind Nginx, so `/api/...` resolves
// against the page's own domain. In dev it's left unset and falls back to
// the Express dev server directly.
//
// NOTE: `||` would be wrong here — '' is falsy in JS, so
// `NEXT_PUBLIC_API_URL || fallback` would silently replace an intentional
// empty string with the dev fallback, making the browser try to call
// http://localhost:4000 (the VISITOR's machine, not the server) in
// production. Only a genuinely *unset* var (undefined) should fall back.
export const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL !== undefined
  ? process.env.NEXT_PUBLIC_API_URL
  : 'http://localhost:4000';

async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : await res.text();
  if (!res.ok) {
    const message = (isJson && body && body.message) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

// For use in Client Components ('use client' files) and browser event handlers.
export async function apiFetch(path, options = {}) {
  const res = await fetch(`${PUBLIC_API_URL}${path}`, {
    credentials: 'include',
    headers: options.body instanceof FormData ? options.headers : {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  return parseResponse(res);
}

// For use in Server Components — forwards the incoming request's session
// cookie so the API sees the same logged-in user. Pass the cookie header
// value from `(await cookies()).toString()`.
export async function serverApiFetch(path, { cookieHeader, ...options } = {}) {
  const res = await fetch(`${INTERNAL_API_URL}${path}`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...options.headers,
    },
    ...options,
  });
  return parseResponse(res);
}
