// Clerk's required landing spot for the OAuth redirect round-trip: Google
// sends the browser back here after the user approves access, and this
// component finishes the handshake with Clerk, then continues on to
// whichever `redirectUrlComplete` was passed to `authenticateWithRedirect()`
// on /login or /register (see those pages) — that's /auth/bridge, which is
// where we hand off from "Clerk knows who you are" to "our own session
// cookie knows who you are".
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

// Same guard as login/register (see the comment there): without this,
// <AuthenticateWithRedirectCallback/> throws for lack of a <ClerkProvider/>
// ancestor — which layout.js only mounts once Clerk is actually configured —
// and that throw happens at BUILD time here (this page has no dynamic data,
// so Next tries to prerender it statically), breaking the production build
// entirely rather than just this one unreachable-until-configured page.
const CLERK_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function SsoCallbackPage() {
  return (
    <div className="form-card" style={{ textAlign: 'center' }}>
      <p className="sub">Finishing sign-in with Google…</p>
      {CLERK_ENABLED && <AuthenticateWithRedirectCallback />}
    </div>
  );
}
