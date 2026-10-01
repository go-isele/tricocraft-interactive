'use client';

// Shared "Continue with Google" button for /login and /register. Clicking it
// hands off entirely to Clerk (Clerk owns the Google OAuth redirect, consent
// screen, and callback — this app never sees a Google credential or token).
// Clerk sends the browser to /sso-callback when Google is done, which then
// continues on to /auth/bridge — see that page for how Clerk's identity
// becomes our own session cookie.
import { useSignIn } from '@clerk/nextjs';
import { useState } from 'react';

export default function GoogleSignInButton() {
  const { isLoaded, signIn } = useSignIn();
  const [starting, setStarting] = useState(false);

  async function continueWithGoogle() {
    if (!isLoaded || starting) return;
    setStarting(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/auth/bridge',
      });
      // Browser is navigating away to Google now — nothing left to do here.
    } catch {
      setStarting(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-block"
      onClick={continueWithGoogle}
      disabled={!isLoaded || starting}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6em',
        background: '#fff', color: '#1f1f1f', border: '1px solid #d7d7d7', marginBottom: '0.9em',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z" />
        <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .95 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
      </svg>
      {starting ? 'Redirecting…' : 'Continue with Google'}
    </button>
  );
}
