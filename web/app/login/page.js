'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch } from '@/lib/api';
import GoogleSignInButton from '@/components/GoogleSignInButton';

// Inlined at build time (NEXT_PUBLIC_*, same as PUBLIC_API_URL in lib/api.js)
// — checked here, outside the component, so GoogleSignInButton (which calls
// Clerk's useSignIn() hook) is never even mounted when Clerk isn't
// configured. Calling that hook without a <ClerkProvider> ancestor throws,
// and layout.js only mounts ClerkProvider under this same flag — see the
// comment there.
const CLERK_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '';
  const { refresh } = useAuth();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = e.target;
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.email.value, password: form.password.value, next }),
      });
      await refresh();
      router.push(data.redirectTo || '/marketplace');
    } catch (err) {
      setError(err.body?.message || err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form-card">
      <h2>Log In</h2>
      <p className="sub">Access your Production Marketplace dashboard.</p>
      {error && <div className="form-error">{error}</div>}
      {CLERK_ENABLED && (
        <>
          <GoogleSignInButton />
          <div className="form-note" style={{ textAlign: 'center', margin: '0.6em 0 1em' }}>or log in with your email</div>
        </>
      )}
      <form onSubmit={onSubmit}>
        <div className="field"><label>Email</label><input type="email" name="email" required autoFocus /></div>
        <div className="field"><label>Password</label><input type="password" name="password" required /></div>
        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>{submitting ? 'Logging in…' : 'Log In'}</button>
      </form>
      <div className="form-note">New here? <Link href="/register" style={{ color: 'var(--rust)', fontWeight: 600 }}>Create an account</Link></div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
